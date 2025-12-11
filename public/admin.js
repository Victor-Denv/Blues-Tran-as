import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, where, doc, updateDoc, setDoc, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCQyjnobWfFqYttYOrQ3xoTRq5PutOi38A",
  authDomain: "blues-afrotrancas.firebaseapp.com",
  projectId: "blues-afrotrancas",
  storageBucket: "blues-afrotrancas.firebasestorage.app",
  messagingSenderId: "62126300208",
  appId: "1:62126300208:web:b6cfde8ea643faa9b5a1f5",
  measurementId: "G-GLYHSNHTG5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let calendarMain; 
let calendarHistory; 
let agendamentoSelecionado = {}; 

const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const btnLogin = document.querySelector('.btn-login');

onAuthStateChanged(auth, (user) => {
    if (user) { alternarTela(true); } else { alternarTela(false); }
});

window.entrar = function() {
    const email = "admin@blues.com"; 
    const inputSenha = document.getElementById('adminPass');
    const senha = inputSenha.value;
    if (!senha) { alert("Digite a senha!"); return; }
    btnLogin.innerText = "Verificando..."; 
    signInWithEmailAndPassword(auth, email, senha)
        .then(() => { btnLogin.innerText = "Entrar"; inputSenha.value = ""; })
        .catch((error) => { console.error(error); btnLogin.innerText = "Entrar"; alert("Senha Incorreta! ❌"); });
}

window.sair = function() { signOut(auth).then(() => window.location.reload()); }

function alternarTela(logado) {
    if (logado) {
        loginScreen.style.display = 'none';
        dashboard.style.display = 'block';
        window.mudarAba('agendado', document.querySelector('.nav-btn.active'));
    } else {
        loginScreen.style.display = 'flex';
        dashboard.style.display = 'none';
    }
}

window.mudarAba = function(nomeAba, btnElement) {
    document.getElementById('tabAgendados').style.display = 'none';
    document.getElementById('tabHistorico').style.display = 'none';
    document.getElementById('tabConfig').style.display = 'none';

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');

    if (nomeAba === 'agendado') {
        document.getElementById('tabAgendados').style.display = 'block';
        if (!calendarMain) iniciarCalendarioPrincipal(); 
        else setTimeout(() => calendarMain.render(), 100); 
    } 
    else if (nomeAba === 'historico') {
        document.getElementById('tabHistorico').style.display = 'block';
        window.carregarHistoricoLista(); 
        if (!calendarHistory) iniciarCalendarioHistorico(); 
        else {
            calendarHistory.refetchEvents(); 
            setTimeout(() => calendarHistory.render(), 100);
        }
    } 
    else if (nomeAba === 'config') {
        document.getElementById('tabConfig').style.display = 'block';
        window.carregarConfiguracoes(); 
    }
}

function iniciarCalendarioPrincipal() {
    const calendarEl = document.getElementById('calendar');
    calendarMain = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'pt-br',
        height: 'auto',
        dayMaxEvents: false, // Permite que a célula cresça para caber texto
        headerToolbar: { left: 'prev,next', center: 'title', right: 'dayGridMonth,listWeek' },
        
        eventContent: function(arg) {
            let icone = arg.event.extendedProps.pixConfirmado ? "✅" : "";
            // Estrutura HTML simplificada para o CSS novo agir
            return {
                html: `
                    <div class="evento-tag" style="${arg.event.extendedProps.pixConfirmado ? 'border-left-color: #10b981;' : ''}">
                        <div class="evento-hora">${arg.event.extendedProps.horario}</div>
                        <div class="evento-nome">${icone} ${arg.event.extendedProps.cliente}</div>
                    </div>
                `
            }
        },

        events: async function(info, successCallback, failureCallback) {
            try {
                const q = query(collection(db, "agendamentos"), where("status", "==", "agendado"));
                const querySnapshot = await getDocs(q);
                let eventos = [];
                querySnapshot.forEach((doc) => {
                    const dados = doc.data();
                    eventos.push({
                        id: doc.id,
                        title: dados.cliente,
                        start: `${dados.data}T${dados.horario}`,
                        extendedProps: { ...dados, docStatus: 'agendado' }
                    });
                });
                successCallback(eventos);
            } catch (e) { failureCallback(e); }
        },
        eventClick: function(info) { 
            abrirModalDetalhes(
                info.event.extendedProps.cliente,
                info.event.extendedProps.servico,
                info.event.start.toLocaleDateString('pt-BR'),
                info.event.extendedProps.horario,
                info.event.extendedProps.celular || info.event.extendedProps.telefone,
                info.event.id,
                info.event.extendedProps.pixConfirmado,
                'agendado'
            ); 
        }
    });
    calendarMain.render();
}

function iniciarCalendarioHistorico() {
    const calendarEl = document.getElementById('calendar-history');
    calendarHistory = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'pt-br',
        height: 'auto',
        dayMaxEvents: false,
        headerToolbar: { left: 'prev,next', center: 'title', right: 'dayGridMonth,listWeek' },
        events: async function(info, successCallback, failureCallback) {
            try {
                const q = query(collection(db, "agendamentos"), where("status", "==", "concluido"));
                const querySnapshot = await getDocs(q);
                let eventos = [];
                querySnapshot.forEach((doc) => {
                    const dados = doc.data();
                    eventos.push({
                        id: doc.id,
                        title: `✅ ${dados.cliente}`,
                        start: `${dados.data}T${dados.horario}`,
                        backgroundColor: '#3b82f6', borderColor: '#3b82f6',
                        extendedProps: { ...dados, docStatus: 'concluido' }
                    });
                });
                successCallback(eventos);
            } catch (e) { failureCallback(e); }
        },
        eventClick: function(info) { 
            abrirModalDetalhes(
                info.event.extendedProps.cliente,
                info.event.extendedProps.servico,
                info.event.start.toLocaleDateString('pt-BR'),
                info.event.extendedProps.horario,
                info.event.extendedProps.celular || info.event.extendedProps.telefone,
                info.event.id,
                info.event.extendedProps.pixConfirmado,
                'concluido'
            ); 
        }
    });
    calendarHistory.render();
}

window.abrirModalDetalhes = function(nome, servico, data, hora, celular, idDoc, pixConfirmado, status) {
    document.getElementById('mNome').innerText = nome;
    document.getElementById('mServico').innerText = servico;
    document.getElementById('mData').innerText = data;
    document.getElementById('mHora').innerText = hora;
    document.getElementById('mTel').innerText = celular || "Sem telefone";

    agendamentoSelecionado = { id: idDoc, celular: celular };

    const btnPix = document.getElementById('btnConfirmarPix');
    if (pixConfirmado) {
        btnPix.innerHTML = '<i class="fa-solid fa-check"></i> PIX Confirmado';
        btnPix.style.backgroundColor = '#10b981'; 
        btnPix.disabled = true;
    } else {
        btnPix.innerHTML = '<i class="fa-solid fa-dollar-sign"></i> Confirmar PIX';
        btnPix.style.backgroundColor = '#3b82f6';
        btnPix.disabled = false;
    }

    const btnConcluir = document.getElementById('btnConcluir');
    if (status === 'concluido') {
        btnConcluir.style.display = 'none'; 
        btnPix.style.display = 'none'; 
    } else {
        btnConcluir.style.display = 'flex'; 
        btnPix.style.display = 'flex';
    }

    const modal = document.getElementById('modalDetalhes');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('ativo'), 10);
}

window.fecharModalDetalhes = function() {
    const modal = document.getElementById('modalDetalhes');
    modal.classList.remove('ativo');
    setTimeout(() => modal.style.display = 'none', 300);
}

const modalOverlay = document.getElementById('modalDetalhes');
if(modalOverlay) {
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === this) fecharModalDetalhes();
    });
}

window.abrirWhatsApp = function() {
    if (!agendamentoSelecionado.celular) return alert("Cliente sem número cadastrado!");
    let num = agendamentoSelecionado.celular.replace(/\D/g, ''); 
    if (!num.startsWith('55')) num = '55' + num; 
    const msg = `Olá! Tudo bem? Passando para confirmar seu agendamento na Blues Afrotranças.`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
}

window.confirmarPix = async function() {
    if(!confirm("Confirmar recebimento do sinal (PIX)?")) return;
    try {
        const btnPix = document.getElementById('btnConfirmarPix');
        btnPix.innerText = "Atualizando...";
        await updateDoc(doc(db, "agendamentos", agendamentoSelecionado.id), { pixConfirmado: true });
        alert("Pagamento confirmado!");
        fecharModalDetalhes();
        if(calendarMain) calendarMain.refetchEvents();
    } catch (e) { console.error(e); alert("Erro ao confirmar PIX."); }
}

window.concluirAtendimento = async function() {
    if(!confirm("Marcar este atendimento como CONCLUÍDO?\n\nEle sairá da agenda principal e irá para o histórico.")) return;
    try {
        const btn = document.getElementById('btnConcluir');
        btn.innerText = "Processando...";
        await updateDoc(doc(db, "agendamentos", agendamentoSelecionado.id), { status: "concluido" });
        alert("Atendimento concluído com sucesso! ✅");
        fecharModalDetalhes();
        if(calendarMain) calendarMain.refetchEvents();
        if(calendarHistory) calendarHistory.refetchEvents();
        btn.innerText = "Concluir Atendimento";
    } catch (e) { console.error(e); alert("Erro ao concluir."); }
}

window.cancelarAgendamento = async function() {
    if (!confirm("Tem certeza que deseja CANCELAR e EXCLUIR este agendamento?")) return;
    try {
        const btn = document.querySelector('.btn-cancel');
        const textoOriginal = btn.innerHTML;
        btn.innerText = "Excluindo...";
        await deleteDoc(doc(db, "agendamentos", agendamentoSelecionado.id));
        alert("Agendamento cancelado com sucesso!");
        fecharModalDetalhes();
        if(calendarMain) calendarMain.refetchEvents();
        btn.innerHTML = textoOriginal;
    } catch (erro) { console.error("Erro ao cancelar:", erro); alert("Erro ao cancelar. Verifique o console."); }
}

window.limparHistorico = async function() {
    if (!confirm("⚠️ ATENÇÃO: Isso apagará TODOS os agendamentos concluídos do histórico.")) return;
    const divLista = document.getElementById('listaHistorico');
    divLista.innerHTML = '<p style="text-align:center;">Limpando...</p>';
    try {
        const q = query(collection(db, "agendamentos"), where("status", "==", "concluido"));
        const snapshot = await getDocs(q);
        if (snapshot.empty) { alert("O histórico já está vazio."); window.carregarHistoricoLista(); return; }
        const batch = writeBatch(db);
        snapshot.forEach((doc) => { batch.delete(doc.ref); });
        await batch.commit();
        alert("Histórico limpo com sucesso!");
        window.carregarHistoricoLista();
        if (calendarHistory) calendarHistory.refetchEvents();
    } catch (error) { console.error("Erro ao limpar histórico:", error); alert("Erro ao limpar histórico."); window.carregarHistoricoLista(); }
}

window.carregarHistoricoLista = async function() {
    const div = document.getElementById('listaHistorico');
    div.innerHTML = '<p style="text-align:center;">Carregando...</p>';
    try {
        const q = query(collection(db, "agendamentos"), where("status", "==", "concluido"), orderBy("data", "desc"));
        const querySnapshot = await getDocs(q);
        if(querySnapshot.empty) { div.innerHTML = "<p style='text-align:center;color:#aaa; padding: 20px;'>Nenhum histórico encontrado.</p>"; return; }
        let html = "";
        querySnapshot.forEach(doc => {
            const d = doc.data();
            const dataBR = new Date(d.data + "T00:00:00").toLocaleDateString('pt-BR');
            html += `
            <div class="admin-card" style="padding:15px; margin-bottom: 10px; border-left: 4px solid #10b981; background: rgba(255,255,255,0.05);">
                <div style="display:flex; justify-content:space-between;">
                    <h4 style="color:#fff; font-size: 1.1rem;">${d.cliente}</h4>
                    <span style="color:#10b981; font-weight:bold;">✔ Concluído</span>
                </div>
                <p style="color:#e2e8f0; margin-top:5px;">📅 ${dataBR} às ${d.horario}</p>
                <p style="color:#94a3b8; font-size: 0.9rem;">${d.servico}</p>
            </div>`;
        });
        div.innerHTML = html;
    } catch (e) { console.error("Erro ao carregar lista:", e); div.innerHTML = '<p style="color:red; text-align:center;">Erro ao carregar lista.</p>'; }
}

window.carregarConfiguracoes = async function() {
    const div = document.getElementById('listaDiasLiberados');
    div.innerHTML = '<p>Carregando...</p>';
    const q = query(collection(db, "disponibilidade"), orderBy("data"));
    const snap = await getDocs(q);
    
    if (snap.empty) { 
        div.innerHTML = '<p style="color:#aaa">Nenhuma configuração especial (Padrão: Todos os dias abertos).</p>'; 
        return; 
    }
    
    let html = "";
    snap.forEach(doc => {
        const d = doc.data();
        const dataBR = new Date(d.data + "T00:00:00").toLocaleDateString('pt-BR');
        
        let info = "";
        let borderClass = "";
        
        if (d.tipo === 'folga') {
            info = `<span style="color:#ef4444; font-weight:bold;">⛔ FOLGA (Fechado)</span>`;
            borderClass = "border-left: 4px solid #ef4444;";
        } else {
            info = `<span style="color:#3b82f6;">📍 ${d.local} | 🕒 ${d.inicio} - ${d.fim}</span>`;
            borderClass = "border-left: 4px solid #3b82f6;";
        }

        html += `<div class="admin-card" style="display:flex; justify-content:space-between; align-items:center; ${borderClass}">
            <div><h4 style="color:#fff; margin-bottom:5px;">${dataBR}</h4>${info}</div>
            <button onclick="removerConfig('${doc.id}')" class="btn-cancelar" style="width:auto;">Remover</button>
        </div>`;
    });
    div.innerHTML = html;
}

window.salvarConfiguracaoDia = async function() {
    const data = document.getElementById('dataConfig').value;
    const tipo = document.getElementById('tipoConfig').value;
    
    if (!data) return alert("Escolha uma data!");

    let config = { data: data, tipo: tipo };

    if (tipo === 'trabalho') {
        const local = document.getElementById('localConfig').value;
        const inicio = document.getElementById('horaInicioConfig').value;
        const fim = document.getElementById('horaFimConfig').value;
        config.local = local;
        config.inicio = inicio;
        config.fim = fim;
    }

    await setDoc(doc(db, "disponibilidade", data), config);
    alert("Configuração salva com sucesso!"); 
    window.carregarConfiguracoes();
}

window.removerConfig = async function(id) {
    if(confirm("Remover esta configuração?\nO dia voltará ao padrão (Aberto em Camaçari).")) {
        await deleteDoc(doc(db, "disponibilidade", id));
        window.carregarConfiguracoes();
    }
}
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, where, doc, updateDoc, setDoc, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const cF = { apiKey: "AIzaSyAyRO6BATvqvRJr2sCh-QFW4FoWh_1GBus",
  authDomain: "blues-afrotrancas-v2.firebaseapp.com",
  projectId: "blues-afrotrancas-v2",
  storageBucket: "blues-afrotrancas-v2.firebasestorage.app",
  messagingSenderId: "917785952384",
  appId: "1:917785952384:web:35f8ee3acfeb320ff7a665",
  measurementId: "G-4YS5GP0626" };

const fApp = initializeApp(cF);
const fDb = getFirestore(fApp);
const fAuth = getAuth(fApp);

let cM; 
let cH; 
let aS = {}; 

const lS = document.getElementById('loginScreen');
const dB = document.getElementById('dashboard');
const bL = document.querySelector('.btn-login');

onAuthStateChanged(fAuth, (u) => {
    if (u) { aT(true); } else { aT(false); }
});

window.entrar = function() {
    const e = "admin@blues.com"; 
    const iS = document.getElementById('adminPass');
    const s = iS.value;
    if (!s) { alert("Digite a senha!"); return; }
    bL.innerText = "Verificando..."; 
    signInWithEmailAndPassword(fAuth, e, s)
        .then(() => { bL.innerText = "Entrar"; iS.value = ""; })
        .catch((e) => { console.error(e); bL.innerText = "Entrar"; alert("Senha Incorreta! ❌"); });
}

window.sair = function() { signOut(fAuth).then(() => window.location.reload()); }

function aT(l) {
    if (l) {
        lS.style.display = 'none';
        dB.style.display = 'block';
        window.mudarAba('agendado', document.querySelector('.nav-btn.active'));
    } else {
        lS.style.display = 'flex';
        dB.style.display = 'none';
    }
}

window.mudarAba = function(nA, bE) {
    document.getElementById('tabAgendados').style.display = 'none';
    document.getElementById('tabHistorico').style.display = 'none';
    document.getElementById('tabConfig').style.display = 'none';

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if(bE) bE.classList.add('active');

    if (nA === 'agendado') {
        document.getElementById('tabAgendados').style.display = 'block';
        if (!cM) iCP(); 
        else setTimeout(() => cM.render(), 100); 
    } 
    else if (nA === 'historico') {
        document.getElementById('tabHistorico').style.display = 'block';
        window.carregarHistoricoLista(); 
        if (!cH) iCH(); 
        else {
            cH.refetchEvents(); 
            setTimeout(() => cH.render(), 100);
        }
    } 
    else if (nA === 'config') {
        document.getElementById('tabConfig').style.display = 'block';
        window.carregarConfiguracoes(); 
    }
}

function iCP() {
    const cE = document.getElementById('calendar');
    cM = new FullCalendar.Calendar(cE, {
        initialView: 'dayGridMonth',
        locale: 'pt-br',
        height: 'auto',
        dayMaxEvents: false,
        headerToolbar: { left: 'prev,next', center: 'title', right: 'dayGridMonth,listWeek' },
        
        eventContent: function(a) {
            let i = a.event.extendedProps.pixConfirmado ? "✅" : "";
            return {
                html: `
                    <div class="evento-tag">
                        <div class="evento-hora">${a.event.extendedProps.horario}</div>
                        <div class="evento-nome">${i} ${a.event.extendedProps.cliente}</div>
                    </div>
                `
            }
        },

        events: async function(i, sC, fC) {
            try {
                const q = query(collection(fDb, "agendamentos"), where("status", "==", "agendado"));
                const qSnap = await getDocs(q);
                let e = [];
                qSnap.forEach((d) => {
                    const dados = d.data();
                    e.push({
                        id: d.id,
                        title: dados.cliente,
                        start: `${dados.data}T${dados.horario}`,
                        extendedProps: { ...dados, docStatus: 'agendado' }
                    });
                });
                sC(e);
            } catch (e) { fC(e); }
        },
        eventClick: function(i) { 
            window.abrirModalDetalhes(
                i.event.extendedProps.cliente,
                i.event.extendedProps.servico,
                i.event.start.toLocaleDateString('pt-BR'),
                i.event.extendedProps.horario,
                i.event.extendedProps.celular || i.event.extendedProps.telefone,
                i.event.id,
                i.event.extendedProps.pixConfirmado,
                'agendado'
            ); 
        }
    });
    cM.render();
}

function iCH() {
    const cE = document.getElementById('calendar-history');
    cH = new FullCalendar.Calendar(cE, {
        initialView: 'dayGridMonth',
        locale: 'pt-br',
        height: 'auto',
        dayMaxEvents: false,
        headerToolbar: { left: 'prev,next', center: 'title', right: 'dayGridMonth,listWeek' },
        events: async function(i, sC, fC) {
            try {
                const q = query(collection(fDb, "agendamentos"), where("status", "==", "concluido"));
                const qSnap = await getDocs(q);
                let e = [];
                qSnap.forEach((d) => {
                    const dados = d.data();
                    e.push({
                        id: d.id,
                        title: `✅ ${dados.cliente}`,
                        start: `${dados.data}T${dados.horario}`,
                        extendedProps: { ...dados, docStatus: 'concluido' }
                    });
                });
                sC(e);
            } catch (e) { fC(e); }
        },
        eventClick: function(i) { 
            window.abrirModalDetalhes(
                i.event.extendedProps.cliente,
                i.event.extendedProps.servico,
                i.event.start.toLocaleDateString('pt-BR'),
                i.event.extendedProps.horario,
                i.event.extendedProps.celular || i.event.extendedProps.telefone,
                i.event.id,
                i.event.extendedProps.pixConfirmado,
                'concluido'
            ); 
        }
    });
    cH.render();
}

window.abrirModalDetalhes = function(n, s, d, h, c, iD, pC, sT) {
    document.getElementById('mNome').innerText = n;
    document.getElementById('mServico').innerText = s;
    document.getElementById('mData').innerText = d;
    document.getElementById('mHora').innerText = h;
    document.getElementById('mTel').innerText = c || "Sem telefone";

    aS = { id: iD, celular: c };

    const bP = document.getElementById('btnConfirmarPix');
    if (pC) {
        bP.innerHTML = '<i class="fa-solid fa-check"></i> PIX Confirmado';
        bP.style.backgroundColor = '#10b981'; 
        bP.disabled = true;
    } else {
        bP.innerHTML = '<i class="fa-solid fa-dollar-sign"></i> Confirmar PIX';
        bP.style.backgroundColor = '#3b82f6';
        bP.disabled = false;
    }

    const bC = document.getElementById('btnConcluir');
    if (sT === 'concluido') {
        bC.style.display = 'none'; 
        bP.style.display = 'none'; 
    } else {
        bC.style.display = 'flex'; 
        bP.style.display = 'flex';
    }

    const mD = document.getElementById('modalDetalhes');
    mD.style.display = 'flex';
    setTimeout(() => mD.classList.add('ativo'), 10);
}

window.fecharModalDetalhes = function() {
    const mD = document.getElementById('modalDetalhes');
    mD.classList.remove('ativo');
    setTimeout(() => mD.style.display = 'none', 300);
}

const mO = document.getElementById('modalDetalhes');
if(mO) {
    mO.addEventListener('click', function(e) {
        if (e.target === this) fecharModalDetalhes();
    });
}

window.abrirWhatsApp = function() {
    if (!aS.celular) return alert("Cliente sem número cadastrado!");
    let n = aS.celular.replace(/\D/g, ''); 
    if (!n.startsWith('55')) n = '55' + n; 
    const m = `Olá! Tudo bem? Passando para confirmar seu agendamento na Blues Afrotranças.`;
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(m)}`, '_blank');
}

window.confirmarPix = async function() {
    if(!confirm("Confirmar recebimento do sinal (PIX)?")) return;
    try {
        const bP = document.getElementById('btnConfirmarPix');
        bP.innerText = "Atualizando...";
        await updateDoc(doc(fDb, "agendamentos", aS.id), { pixConfirmado: true });
        alert("Pagamento confirmado!");
        fecharModalDetalhes();
        if(cM) cM.refetchEvents();
    } catch (e) { console.error(e); alert("Erro ao confirmar PIX."); }
}

window.concluirAtendimento = async function() {
    if(!confirm("Marcar este atendimento como CONCLUÍDO?\n\nEle sairá da agenda principal e irá para o histórico.")) return;
    try {
        const b = document.getElementById('btnConcluir');
        b.innerText = "Processando...";
        await updateDoc(doc(fDb, "agendamentos", aS.id), { status: "concluido" });
        alert("Atendimento concluído com sucesso! ✅");
        fecharModalDetalhes();
        if(cM) cM.refetchEvents();
        if(cH) cH.refetchEvents();
        b.innerText = "Concluir Atendimento";
    } catch (e) { console.error(e); alert("Erro ao concluir."); }
}

window.cancelarAgendamento = async function() {
    if (!confirm("Tem certeza que deseja CANCELAR e EXCLUIR este agendamento?")) return;
    try {
        const b = document.querySelector('.btn-cancel');
        const tO = b.innerHTML;
        b.innerText = "Excluindo...";
        await deleteDoc(doc(fDb, "agendamentos", aS.id));
        alert("Agendamento cancelado com sucesso!");
        fecharModalDetalhes();
        if(cM) cM.refetchEvents();
        b.innerHTML = tO;
    } catch (e) { console.error("Erro ao cancelar:", e); alert("Erro ao cancelar. Verifique o console."); }
}

window.limparHistorico = async function() {
    if (!confirm("⚠️ ATENÇÃO: Isso apagará TODOS os agendamentos concluídos do histórico.")) return;
    const dL = document.getElementById('listaHistorico');
    dL.innerHTML = '<p style="text-align:center;">Limpando...</p>';
    try {
        const q = query(collection(fDb, "agendamentos"), where("status", "==", "concluido"));
        const s = await getDocs(q);
        if (s.empty) { alert("O histórico já está vazio."); window.carregarHistoricoLista(); return; }
        const b = writeBatch(fDb);
        s.forEach((d) => { b.delete(d.ref); });
        await b.commit();
        alert("Histórico limpo com sucesso!");
        window.carregarHistoricoLista();
        if (cH) cH.refetchEvents();
    } catch (e) { console.error("Erro ao limpar histórico:", e); alert("Erro ao limpar histórico."); window.carregarHistoricoLista(); }
}

window.carregarHistoricoLista = async function() {
    const d = document.getElementById('listaHistorico');
    d.innerHTML = '<p style="text-align:center;">Carregando...</p>';
    try {
        const q = query(collection(fDb, "agendamentos"), where("status", "==", "concluido"), orderBy("data", "desc"));
        const qSnap = await getDocs(q);
        if(qSnap.empty) { d.innerHTML = "<p style='text-align:center;color:#aaa; padding: 20px;'>Nenhum histórico encontrado.</p>"; return; }
        let h = "";
        qSnap.forEach(doc => {
            const dados = doc.data();
            const dBR = new Date(dados.data + "T00:00:00").toLocaleDateString('pt-BR');
            h += `
            <div class="admin-card" style="padding:15px; margin-bottom: 10px; border-left: 4px solid #10b981; background: rgba(255,255,255,0.05);">
                <div style="display:flex; justify-content:space-between;">
                    <h4 style="color:#fff; font-size: 1.1rem;">${dados.cliente}</h4>
                    <span style="color:#10b981; font-weight:bold;">✔ Concluído</span>
                </div>
                <p style="color:#e2e8f0; margin-top:5px;">📅 ${dBR} às ${dados.horario}</p>
                <p style="color:#94a3b8; font-size: 0.9rem;">${dados.servico}</p>
            </div>`;
        });
        d.innerHTML = h;
    } catch (e) { console.error("Erro ao carregar lista:", e); d.innerHTML = '<p style="color:red; text-align:center;">Erro ao carregar lista.</p>'; }
}

window.carregarConfiguracoes = async function() {
    const d = document.getElementById('listaDiasLiberados');
    d.innerHTML = '<p>Carregando...</p>';
    const q = query(collection(fDb, "disponibilidade"), orderBy("data"));
    const s = await getDocs(q);
    
    if (s.empty) { 
        d.innerHTML = '<p style="color:#aaa">Nenhuma configuração especial (Padrão: Todos os dias abertos).</p>'; 
        return; 
    }
    
    let h = "";
    s.forEach(doc => {
        const dados = doc.data();
        const dBR = new Date(dados.data + "T00:00:00").toLocaleDateString('pt-BR');
        
        let i = "";
        
        if (dados.tipo === 'folga') {
            i = `<span style="color:#ef4444; font-weight:bold;">⛔ FOLGA</span>`;
        } else {
            i = `<span style="color:#3b82f6;">📍 ${dados.local} | 🕒 ${dados.inicio} - ${dados.fim}</span>`;
        }

        h += `<div class="admin-card" style="display:flex; justify-content:space-between; align-items:center;">
            <div><h4 style="color:#fff; margin-bottom:5px;">${dBR}</h4>${i}</div>
            <button onclick="removerConfig('${doc.id}')" class="btn-cancelar" style="width:auto;">Remover</button>
        </div>`;
    });
    d.innerHTML = h;
}

window.salvarConfiguracaoDia = async function() {
    const d = document.getElementById('dataConfig').value;
    const t = document.getElementById('tipoConfig').value;
    
    if (!d) return alert("Escolha uma data!");

    let c = { data: d, tipo: t };

    if (t === 'trabalho') {
        const l = document.getElementById('localConfig').value;
        const i = document.getElementById('horaInicioConfig').value;
        const f = document.getElementById('horaFimConfig').value;
        c.local = l;
        c.inicio = i;
        c.fim = f;
    }

    await setDoc(doc(fDb, "disponibilidade", d), c);
    alert("Configuração salva com sucesso!"); 
    window.carregarConfiguracoes();
}

window.removerConfig = async function(i) {
    if(confirm("Remover esta configuração?\nO dia voltará ao padrão (Aberto em Camaçari).")) {
        await deleteDoc(doc(fDb, "disponibilidade", i));
        window.carregarConfiguracoes();
    }
}
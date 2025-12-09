import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, where, doc, updateDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const MEU_NUMERO = "557581079652"; 

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

// --- Elementos ---
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const btnLogin = document.querySelector('.btn-login');

// --- AUTENTICAÇÃO ---
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
        window.carregarDados('agendado');
    } else {
        loginScreen.style.display = 'flex';
        dashboard.style.display = 'none';
    }
}

function formatDataBR(dataString) {
    if(!dataString) return "Inválido";
    const dataObj = new Date(dataString);
    return new Date(dataObj.valueOf() + dataObj.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
}

// --- FUNÇÕES DE AGENDA ---
let textoResumoGlobal = "";

window.enviarResumoZap = function() {
    if(!textoResumoGlobal) return;
    const link = `https://wa.me/${MEU_NUMERO}?text=${encodeURIComponent(textoResumoGlobal)}`;
    window.open(link, '_blank');
}

window.enviarLembrete = function(telefone, nome, horario, servico) {
    const telLimpo = telefone.replace(/\D/g, '');
    const mensagem = `Oie ${nome}! 💙\nPassando pra lembrar do nosso horário *amanhã às ${horario}* para fazer *${servico}*.\n\nConfirma pra mim se tá tudo certo? 🥰`;
    const link = `https://wa.me/55${telLimpo}?text=${encodeURIComponent(mensagem)}`;
    window.open(link, '_blank');
}

window.mudarAba = function(status) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    const areaLista = document.getElementById('listaAgendamentos');
    const areaConfig = document.getElementById('areaConfig');

    if(status === 'config') {
        document.getElementById('tabConfig').classList.add('active');
        areaLista.style.display = 'none';
        areaConfig.style.display = 'block';
        window.carregarDiasLiberados(); 
    } else {
        areaConfig.style.display = 'none';
        areaLista.style.display = 'block';
        if(status === 'agendado') document.getElementById('tabAgendados').classList.add('active');
        else document.getElementById('tabHistorico').classList.add('active');
        window.carregarDados(status);
    }
}

window.confirmarPix = async function(id) {
    if(confirm("Confirmar o recebimento do sinal?")) {
        try {
            const ref = doc(db, "agendamentos", id);
            await updateDoc(ref, { pixConfirmado: true });
            window.carregarDados('agendado');
        } catch (e) { console.error(e); alert("Erro ao confirmar PIX."); }
    }
}

window.concluirAgendamento = async function(id) {
    if(confirm("Serviço realizado? Mover para histórico.")) {
        try {
            const ref = doc(db, "agendamentos", id);
            await updateDoc(ref, { status: "concluido" });
            window.carregarDados('agendado');
        } catch (e) { console.error(e); alert("Erro ao concluir."); }
    }
}

// --- NOVA FUNÇÃO: CANCELAR ---
window.cancelarAgendamento = async function(id) {
    if(confirm("❌ Tem certeza que deseja CANCELAR este agendamento? O horário ficará livre novamente.")) {
        try {
            const ref = doc(db, "agendamentos", id);
            await updateDoc(ref, { status: "cancelado" }); // Muda status para cancelado
            window.carregarDados('agendado');
        } catch (e) { console.error(e); alert("Erro ao cancelar."); }
    }
}

// --- FUNÇÕES DE CONFIGURAÇÃO (DIAS E HORAS) ---

window.adicionarDia = async function() {
    const data = document.getElementById('dataConfig').value;
    const local = document.getElementById('localConfig').value;
    const inicio = document.getElementById('horaInicioConfig').value || "08:00";
    const fim = document.getElementById('horaFimConfig').value || "18:00";

    if (!data) return alert("Escolha uma data!");

    try {
        await setDoc(doc(db, "disponibilidade", data), {
            data: data,
            local: local,
            inicio: inicio,
            fim: fim
        });
        alert("Dia liberado com sucesso!");
        window.carregarDiasLiberados();
    } catch (e) {
        console.error(e);
        alert("Erro ao liberar data.");
    }
}

window.removerDia = async function(dataId) {
    if(confirm("Bloquear este dia novamente (Folga)?")) {
        try {
            await deleteDoc(doc(db, "disponibilidade", dataId));
            window.carregarDiasLiberados();
        } catch (e) { console.error(e); alert("Erro ao remover."); }
    }
}

window.carregarDiasLiberados = async function() {
    const div = document.getElementById('listaDiasLiberados');
    div.innerHTML = '<p style="color:#888;">Carregando...</p>';

    try {
        const q = query(collection(db, "disponibilidade"), orderBy("data"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            div.innerHTML = '<p style="color:#aaa;">Nenhum dia liberado.</p>';
            return;
        }

        let html = "";
        querySnapshot.forEach((docSnap) => {
            const dados = docSnap.data();
            const dataBR = new Date(dados.data + "T00:00:00").toLocaleDateString('pt-BR');
            const corBorda = dados.local.includes("Camaçari") ? "#06b6d4" : "#f59e0b"; 
            
            html += `
                <div class="admin-card" style="border-left: 5px solid ${corBorda}; display:flex; justify-content:space-between; align-items:center; padding:15px;">
                    <div>
                        <h4 style="color:#fff;">${dataBR}</h4>
                        <span style="color:${corBorda}; font-size:0.9rem;">📍 ${dados.local}</span>
                        <div style="font-size:0.8rem; color:#ccc;">🕒 ${dados.inicio} às ${dados.fim}</div>
                    </div>
                    <button onclick="removerDia('${docSnap.id}')" style="background:transparent; border:1px solid #ef4444; color:#ef4444; padding:5px 10px; border-radius:5px; cursor:pointer;">
                        Bloquear
                    </button>
                </div>
            `;
        });
        div.innerHTML = html;
    } catch (e) { console.error(e); div.innerHTML = "Erro ao carregar."; }
}

// --- CARREGAR DADOS ---
window.carregarDados = async function(statusFiltro = 'agendado') {
    const listaDiv = document.getElementById('listaAgendamentos');
    if (!listaDiv || !auth.currentUser) return;
    listaDiv.innerHTML = '<div style="text-align:center; padding: 40px;"><span class="material-icons" style="font-size: 40px; color: #3b82f6; animation: spin 1s infinite;">autorenew</span></div>';

    const hoje = new Date();
    const amanha = new Date();
    amanha.setDate(hoje.getDate() + 1);
    const ano = amanha.getFullYear();
    const mes = String(amanha.getMonth() + 1).padStart(2, '0');
    const dia = String(amanha.getDate()).padStart(2, '0');
    const stringAmanha = `${ano}-${mes}-${dia}`;
    const dataAmanhaBR = amanha.toLocaleDateString('pt-BR');

    try {
        const q = query(collection(db, "agendamentos"), where("status", "==", statusFiltro), orderBy("data"), orderBy("horario"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            listaDiv.innerHTML = `<div style="text-align:center; margin-top:40px; color:#aaa;"><h3>Nenhum item aqui.</h3></div>`;
            return;
        }

        let htmlFinal = "";
        let ultimaData = "";
        let cardsBuffer = "";
        let listaAmanha = [];
        textoResumoGlobal = "";

        querySnapshot.forEach((docSnap) => {
            const dados = docSnap.data();
            const id = docSnap.id;
            const nome = dados.cliente || "Cliente";
            const servico = dados.servico || "Serviço";
            const horario = dados.horario || "--:--";
            const valor = dados.valor ? dados.valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : "R$ 0,00";
            const zapLink = dados.telefone ? `https://wa.me/55${dados.telefone.replace(/\D/g,'')}` : "#";
            const dataBR = formatDataBR(dados.data);
            const periodo = dados.periodo ? dados.periodo.toUpperCase() : "";
            
            let btnLembrete = "";
            if (dados.data === stringAmanha && statusFiltro === 'agendado') {
                listaAmanha.push(`⏰ *${horario}* - ${nome} (${servico})`);
                btnLembrete = `<button onclick="enviarLembrete('${dados.telefone}', '${nome}', '${horario}', '${servico}')" class="btn-lembrete">🔔 Enviar Lembrete</button>`;
            }

            const isPixOk = dados.pixConfirmado === true;
            let acoes = "";
            
            if (statusFiltro === 'agendado') {
                const pixBtn = isPixOk 
                    ? `<div class="badge-pix ok">✅ Sinal Confirmado</div>` 
                    : `<button onclick="confirmarPix('${id}')" class="btn-pix">💰 Confirmar PIX</button>`;
                
                // Botão de Cancelar aparece se ainda não foi concluído
                const cancelBtn = `<button onclick="cancelarAgendamento('${id}')" class="btn-cancelar">❌ Cancelar</button>`;
                
                const concluirBtn = `<button onclick="concluirAgendamento('${id}')" class="btn-concluir">Marcar como Feito</button>`;
                
                acoes = pixBtn + cancelBtn + concluirBtn;
            } else {
                acoes = isPixOk ? `<span style="color:#10b981; font-size:0.8rem;">Sinal OK</span>` : `<span style="color:#ef4444; font-size:0.8rem;">Sem Sinal</span>`;
            }

            if (dataBR !== ultimaData) {
                if (ultimaData !== "") htmlFinal += `<div class="cards-grid">${cardsBuffer}</div>`;
                htmlFinal += `<h3 class="section-title">📅 ${dataBR}</h3>`;
                ultimaData = dataBR;
                cardsBuffer = "";
            }

            cardsBuffer += `
                <div class="admin-card ${isPixOk ? 'border-green' : ''}">
                    <div class="card-header"><span class="time-badge">${horario} ${periodo ? '('+periodo+')' : ''}</span><span class="price-tag">${valor}</span></div>
                    <div class="card-body">
                        <div class="client-name">${nome}</div>
                        <span class="service-name">${servico}</span>
                        ${btnLembrete}
                        ${acoes}
                        <div class="info-row" style="margin-top:10px;"><span class="material-icons small">place</span>${dados.endereco || '-'}</div>
                        <div class="info-row"><span class="material-icons small">phone</span>${dados.telefone || '-'}</div>
                    </div>
                    <div class="card-footer"><a href="${zapLink}" target="_blank" class="btn-whatsapp-card">WhatsApp</a></div>
                </div>
            `;
        });

        let botaoResumoHTML = "";
        if (listaAmanha.length > 0) {
            textoResumoGlobal = `📅 *Agenda de Amanhã (${dataAmanhaBR})*:\n\n${listaAmanha.join('\n')}\n\n💙 _Blues Afrotrancas_`;
            botaoResumoHTML = `<div style="margin-bottom: 25px;"><button onclick="enviarResumoZap()" class="btn-resumo-trancista">📑 Enviar Agenda de Amanhã p/ Mim (${listaAmanha.length})</button></div>`;
        }

        htmlFinal += `<div class="cards-grid">${cardsBuffer}</div>`;
        listaDiv.innerHTML = botaoResumoHTML + htmlFinal;
    } catch (error) { console.error(error); listaDiv.innerHTML = `<div class="alert-box error">Erro: ${error.message}</div>`; }
}
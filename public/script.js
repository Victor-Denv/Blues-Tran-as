import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const PHONE_NUMBER = "557581079652"; 

const serviceSelect = document.getElementById('serviceSelect');
const dateInput = document.getElementById('dateInput');
const timeSlot = document.getElementById('timeSlot');
const dateAlert = document.getElementById('dateAlert');
const btnSend = document.getElementById('btnSend');
const paymentSection = document.getElementById('paymentSection');
const fullPriceDisplay = document.getElementById('fullPrice');
const depositPriceDisplay = document.getElementById('depositPrice');
const clientAddressSelect = document.getElementById('clientAddress');
const divUltimoProcedimento = document.getElementById('divUltimoProcedimento');

function formatDataBR(dataString) {
    if(!dataString) return "Não informado";
    const dataObj = new Date(dataString);
    return new Date(dataObj.valueOf() + dataObj.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
}

clientAddressSelect.addEventListener('change', function() {
    dateInput.value = '';
    timeSlot.innerHTML = '<option value="">Data...</option>';
    timeSlot.disabled = true;
});

serviceSelect.addEventListener('change', function() {
    const price = parseFloat(this.value);
    const serviceName = this.options[this.selectedIndex].text;
    if (serviceName.toLowerCase().includes("manutenção") || serviceName.toLowerCase().includes("retwist")) {
        divUltimoProcedimento.style.display = 'block';
    } else {
        divUltimoProcedimento.style.display = 'none';
    }

    if (price > 0) {
        dateInput.disabled = false;
        paymentSection.style.display = 'block';
        const deposit = price * 0.30;
        fullPriceDisplay.innerText = price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        depositPriceDisplay.innerText = deposit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        dateInput.value = '';
        timeSlot.innerHTML = '<option value="">Data...</option>';
        timeSlot.disabled = true;
        btnSend.disabled = true;
    } else {
        paymentSection.style.display = 'none';
        dateInput.disabled = true;
    }
});

dateInput.addEventListener('change', async function() {
    const data = this.value;
    const option = serviceSelect.options[serviceSelect.selectedIndex];
    const tipoServico = option.getAttribute('data-tipo');
    const cidadeCliente = clientAddressSelect.value;

    if (!cidadeCliente) { alert("Selecione sua cidade primeiro."); this.value = ""; return; }
    if (!data || !tipoServico) return;

    timeSlot.innerHTML = '<option>Verificando...</option>';
    timeSlot.disabled = true;
    btnSend.disabled = true;
    dateAlert.style.display = 'none';

    try {
        const docRef = doc(db, "disponibilidade", data);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            msgErro("Agenda fechada para este dia (Folga).");
            timeSlot.innerHTML = '<option>Indisponível</option>';
            return;
        }

        const infoDia = docSnap.data();
        if (infoDia.local !== cidadeCliente) {
            msgErro(`Nesta data estarei em ${infoDia.local}.`);
            timeSlot.innerHTML = '<option>Outra Cidade</option>';
            return;
        }

        const horaInicio = infoDia.inicio || "08:00";
        const horaFim = infoDia.fim || "18:00";

        const q = query(collection(db, "agendamentos"), where("data", "==", data), where("status", "==", "agendado"));
        const querySnapshot = await getDocs(q);

        let manhaOcupada = false;
        let tardeOcupada = false;
        let diaInteiroBloqueado = false;

        querySnapshot.forEach((doc) => {
            const ag = doc.data();
            if (ag.tipoDuracao === 'longo') diaInteiroBloqueado = true;
            if (ag.periodo === 'manha') manhaOcupada = true;
            if (ag.periodo === 'tarde') tardeOcupada = true;
        });

        let htmlOpcoes = '<option value="">Selecione...</option>';
        let temVaga = false;

        if (diaInteiroBloqueado) {
            msgErro("Dia já lotado (serviço longo agendado).");
            timeSlot.innerHTML = '<option>Cheio</option>';
            return;
        }

        const permiteManha = ("09:00" >= horaInicio && "09:00" < horaFim);
        const permiteTarde = ("14:00" >= horaInicio && "14:00" < horaFim);
        const permiteDiaTodo = ("08:00" >= horaInicio && "18:00" <= horaFim);

        if (tipoServico === 'longo') {
            if (!manhaOcupada && !tardeOcupada && permiteDiaTodo) {
                htmlOpcoes += '<option value="08:00" data-periodo="dia_todo">08:00 (Dia Inteiro)</option>';
                temVaga = true;
            } else {
                if(!permiteDiaTodo) msgErro("Horário de atendimento reduzido neste dia.");
                else msgErro("Requer o dia todo livre.");
            }
        } else {
            if (!manhaOcupada && permiteManha) {
                htmlOpcoes += '<option value="09:00" data-periodo="manha">09:00 (Manhã)</option>';
                temVaga = true;
            }
            if (!tardeOcupada && permiteTarde) {
                htmlOpcoes += '<option value="14:00" data-periodo="tarde">14:00 (Tarde)</option>';
                temVaga = true;
            }
            if (!temVaga) msgErro("Horários ocupados ou indisponíveis.");
        }

        timeSlot.innerHTML = htmlOpcoes;
        if (temVaga) { timeSlot.disabled = false; msgSucesso("Horários disponíveis!"); }

    } catch (erro) { console.error(erro); alert("Erro ao verificar agenda."); }
});

function msgErro(texto) { dateAlert.innerText = texto; dateAlert.className = "alert-box error"; dateAlert.style.display = 'block'; }
function msgSucesso(texto) { dateAlert.innerText = texto; dateAlert.className = "alert-box success"; dateAlert.style.display = 'block'; }

timeSlot.addEventListener('change', function() { if(this.value) btnSend.disabled = false; });

btnSend.addEventListener('click', async function() {
    const nome = document.getElementById('clientName').value;
    const tel = document.getElementById('clientPhone').value;
    const endereco = document.getElementById('clientAddress').value;
    const ultimoProcInput = document.getElementById('lastProcedureDate');
    const ultimoProc = divUltimoProcedimento.style.display !== 'none' ? ultimoProcInput.value : "Não se aplica";
    
    const date = dateInput.value;
    const time = timeSlot.value;
    const timeOption = timeSlot.options[timeSlot.selectedIndex];
    const periodo = timeOption.getAttribute('data-periodo');
    const select = serviceSelect;
    const serviceName = select.options[select.selectedIndex].text;
    const tipoDuracao = select.options[select.selectedIndex].getAttribute('data-tipo');
    const price = parseFloat(select.value);

    if (!date || !time || !nome || !tel) { alert("Preencha todos os campos."); return; }

    btnSend.innerText = "Agendando...";
    btnSend.disabled = true;

    try {
        await addDoc(collection(db, "agendamentos"), {
            cliente: nome, telefone: tel, endereco: endereco, ultimoProcedimento: ultimoProc,
            data: date, horario: time, periodo: periodo, tipoDuracao: tipoDuracao,
            servico: serviceName, valor: price, status: "agendado", pixConfirmado: false, criadoEm: new Date().toISOString()
        });
        
        const depositValue = (price * 0.30).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const dataBR = formatDataBR(date);
        const message = `Olá! Sou *${nome}* e fiz um agendamento.\n\n📅 *Data:* ${dataBR} às ${time}\n💇🏾‍♀️ *Serviço:* ${serviceName}\n📍 *Endereço:* ${endereco}\n💰 *Sinal:* ${depositValue}\n\nAguardo a chave PIX para confirmar!`;
        
        window.open(`https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
        setTimeout(() => { window.location.reload(); }, 1500);
    } catch (e) { console.error(e); alert("Erro ao agendar."); btnSend.disabled = false; }
});

// --- CORREÇÃO DO MODAL (ADICIONANDO A CLASSE .ativo) ---
window.abrirModal = function() {
    const modal = document.getElementById('modalConsulta');
    modal.style.display = 'flex';
    // Pequeno delay para permitir a transição CSS de opacidade
    setTimeout(() => {
        modal.classList.add('ativo');
    }, 10);
}

window.fecharModal = function() {
    const modal = document.getElementById('modalConsulta');
    modal.classList.remove('ativo');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300); // Espera o tempo da transição
}

// Fechar ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('modalConsulta');
    if (event.target == modal) {
        window.fecharModal();
    }
}

window.buscarAgendamentos = async function() {
    const telefoneInput = document.getElementById('searchPhone').value;
    const resultadoDiv = document.getElementById('resultadoBusca');
    if(!telefoneInput) { alert("Digite seu número!"); return; }
    resultadoDiv.innerHTML = '<p style="color:#aaa; text-align:center;">Buscando...</p>';

    try {
        const q = query(collection(db, "agendamentos"), where("telefone", "==", telefoneInput), where("status", "==", "agendado"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            resultadoDiv.innerHTML = '<p style="color:#fca5a5; text-align:center;">Nenhum agendamento ativo.</p>';
            return;
        }

        let html = "";
        querySnapshot.forEach((doc) => {
            const dados = doc.data();
            const dataObj = new Date(dados.data);
            const dataBR = new Date(dataObj.valueOf() + dataObj.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
            let statusHtml = dados.pixConfirmado ? `<span class="status-badge badge-verde">✅ Confirmado</span>` : `<span class="status-badge badge-amarelo">🟡 Aguardando Sinal</span>`;
            let classeBorda = dados.pixConfirmado ? "confirmado" : "pendente";

            html += `<div class="status-card ${classeBorda}">${statusHtml}<h4 style="color:#fff; margin: 5px 0;">${dados.servico}</h4><p style="color:#ccc;">📅 ${dataBR} às ${dados.horario}</p></div>`;
        });
        resultadoDiv.innerHTML = html;
    } catch (e) { console.error(e); resultadoDiv.innerHTML = '<p>Erro ao buscar.</p>'; }
}
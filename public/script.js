import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURAÇÃO FIREBASE ---
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
// Procure onde está PHONE_NUMBER e deixe assim:
const PHONE_NUMBER = "557581079652";

// Elementos
const serviceSelect = document.getElementById('serviceSelect');
const dateInput = document.getElementById('dateInput');
const timeSlot = document.getElementById('timeSlot');
const dateAlert = document.getElementById('dateAlert');
const btnSend = document.getElementById('btnSend');
const paymentSection = document.getElementById('paymentSection');
const fullPriceDisplay = document.getElementById('fullPrice');
const depositPriceDisplay = document.getElementById('depositPrice');

function formatDataBR(dataString) {
    if(!dataString) return "Não informado";
    const dataObj = new Date(dataString);
    return new Date(dataObj.valueOf() + dataObj.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
}

// 1. Ao selecionar serviço
serviceSelect.addEventListener('change', function() {
    const price = parseFloat(this.value);
    
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

// 2. Ao escolher data
dateInput.addEventListener('change', async function() {
    const data = this.value;
    const option = serviceSelect.options[serviceSelect.selectedIndex];
    const tipoServico = option.getAttribute('data-tipo');

    if (!data || !tipoServico) return;

    timeSlot.innerHTML = '<option>Verificando...</option>';
    timeSlot.disabled = true;
    btnSend.disabled = true;
    dateAlert.style.display = 'none';

    try {
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
            msgErro("Dia indisponível (Já existe um serviço longo agendado).");
            timeSlot.innerHTML = '<option>Cheio</option>';
            return;
        }

        if (tipoServico === 'longo') {
            if (!manhaOcupada && !tardeOcupada) {
                htmlOpcoes += '<option value="08:00" data-periodo="dia_todo">08:00 (Dia Inteiro)</option>';
                temVaga = true;
            } else {
                msgErro("Este serviço requer o dia todo livre.");
            }
        } 
        else {
            if (!manhaOcupada) {
                htmlOpcoes += '<option value="09:00" data-periodo="manha">09:00 (Manhã)</option>';
                temVaga = true;
            }
            if (!tardeOcupada) {
                htmlOpcoes += '<option value="14:00" data-periodo="tarde">14:00 (Tarde)</option>';
                temVaga = true;
            }
            if (!temVaga) msgErro("Todos os turnos ocupados neste dia.");
        }

        timeSlot.innerHTML = htmlOpcoes;
        if (temVaga) {
            timeSlot.disabled = false;
            msgSucesso("Horários disponíveis!");
        }

    } catch (erro) {
        console.error(erro);
        alert("Erro ao verificar agenda.");
    }
});

function msgErro(texto) {
    dateAlert.innerText = texto;
    dateAlert.className = "alert-box error";
    dateAlert.style.display = 'block';
}
function msgSucesso(texto) {
    dateAlert.innerText = texto;
    dateAlert.className = "alert-box success";
    dateAlert.style.display = 'block';
}

timeSlot.addEventListener('change', function() {
    if(this.value) btnSend.disabled = false;
});

// Enviar Agendamento
btnSend.addEventListener('click', async function() {
    const nome = document.getElementById('clientName').value;
    const tel = document.getElementById('clientPhone').value;
    const endereco = document.getElementById('clientAddress').value;
    const ultimoProc = document.getElementById('lastProcedureDate').value;
    
    const date = dateInput.value;
    const time = timeSlot.value;
    const timeOption = timeSlot.options[timeSlot.selectedIndex];
    const periodo = timeOption.getAttribute('data-periodo');

    const select = serviceSelect;
    const serviceName = select.options[select.selectedIndex].text;
    const tipoDuracao = select.options[select.selectedIndex].getAttribute('data-tipo');
    const price = parseFloat(select.value);

    if (!date || !time || !nome || !tel) {
        alert("Preencha todos os campos.");
        return;
    }

    btnSend.innerText = "Agendando...";
    btnSend.disabled = true;

    try {
        await addDoc(collection(db, "agendamentos"), {
            cliente: nome,
            telefone: tel,
            endereco: endereco,
            ultimoProcedimento: ultimoProc,
            data: date,
            horario: time,
            periodo: periodo, 
            tipoDuracao: tipoDuracao,
            servico: serviceName,
            valor: price,
            status: "agendado",
            pixConfirmado: false,
            criadoEm: new Date().toISOString()
        });

        const depositValue = (price * 0.30).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const dataBR = formatDataBR(date);

        const message = `Olá! Sou *${nome}* e fiz um agendamento.\n\n` +
                        `📅 *Data:* ${dataBR} às ${time}\n` +
                        `💇🏾‍♀️ *Serviço:* ${serviceName}\n` +
                        `📍 *Endereço:* ${endereco}\n` +
                        `💰 *Sinal:* ${depositValue}\n\n` +
                        `Aguardo a chave PIX para confirmar!`;

        const url = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
        setTimeout(() => { window.location.reload(); }, 1500);

    } catch (e) {
        console.error(e);
        alert("Erro ao agendar.");
        btnSend.disabled = false;
    }
});

// --- FUNÇÕES DE CONSULTA (MODAL) ---

window.abrirModal = function() {
    document.getElementById('modalConsulta').style.display = 'flex';
}

window.fecharModal = function() {
    document.getElementById('modalConsulta').style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('modalConsulta');
    if (event.target == modal) {
        modal.style.display = "none";
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
            resultadoDiv.innerHTML = '<p style="color:#fca5a5; text-align:center;">Nenhum agendamento encontrado para este número. Verifique se digitou igual ao cadastro.</p>';
            return;
        }

        let html = "";

        querySnapshot.forEach((doc) => {
            const dados = doc.data();
            const dataObj = new Date(dados.data);
            const dataBR = new Date(dataObj.valueOf() + dataObj.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
            
            let statusHtml = "";
            let classeBorda = "";

            if(dados.pixConfirmado) {
                statusHtml = `<span class="status-badge badge-verde">✅ Confirmado</span>`;
                classeBorda = "confirmado";
            } else {
                statusHtml = `<span class="status-badge badge-amarelo">🟡 Aguardando Sinal (PIX)</span>
                              <p style="font-size:0.8rem; color:#ccc; margin-top:5px;">O admin ainda não confirmou o pagamento.</p>`;
                classeBorda = "pendente";
            }

            html += `
                <div class="status-card ${classeBorda}">
                    ${statusHtml}
                    <h4 style="color:#fff; margin: 5px 0;">${dados.servico}</h4>
                    <p style="color:#ccc;">📅 ${dataBR} às ${dados.horario}</p>
                    <p style="color:#888; font-size:0.9rem;">Valor Total: ${dados.valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                </div>
            `;
        });

        resultadoDiv.innerHTML = html;

    } catch (e) {
        console.error(e);
        resultadoDiv.innerHTML = '<p>Erro ao buscar.</p>';
    }
}
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- COLE SUA CONFIGURAÇÃO DO FIREBASE ABAIXO ---
const firebaseConfig = {
  apiKey: "AIzaSyCQyjnobWfFqYttYOrQ3xoTRq5PutOi38A",
  authDomain: "blues-afrotrancas.firebaseapp.com",
  projectId: "blues-afrotrancas",
  storageBucket: "blues-afrotrancas.firebasestorage.app",
  messagingSenderId: "62126300208",
  appId: "1:62126300208:web:b6cfde8ea643faa9b5a1f5",
  measurementId: "G-GLYHSNHTG5"
};
// ------------------------------------------------

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PHONE_NUMBER = "557184722564"; 

// Elementos
const dateInput = document.getElementById('dateInput');
const timeInput = document.getElementById('timeInput');
const dateAlert = document.getElementById('dateAlert');
const btnSend = document.getElementById('btnSend');
const serviceSelect = document.getElementById('serviceSelect');
const paymentSection = document.getElementById('paymentSection');
const fullPriceDisplay = document.getElementById('fullPrice');
const depositPriceDisplay = document.getElementById('depositPrice');

// Formata data para o padrão BR (DD/MM/AAAA)
function formatDataBR(dataString) {
    if(!dataString) return "Não informado";
    const dataObj = new Date(dataString);
    return new Date(dataObj.valueOf() + dataObj.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
}

// Verifica Disponibilidade
async function verificarDisponibilidade(dataEscolhida) {
    const q = query(collection(db, "agendamentos"), where("data", "==", dataEscolhida));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty; 
}

// Ao mudar a data
dateInput.addEventListener('change', async function() {
    const data = this.value;
    if (!data) return;

    btnSend.innerText = "Verificando data...";
    btnSend.disabled = true;

    try {
        const estaOcupado = await verificarDisponibilidade(data);

        if (estaOcupado) {
            dateAlert.style.display = 'block';
            dateAlert.innerText = "Esta data já está reservada! Escolha outro dia.";
            dateAlert.className = "alert-box error";
            this.value = '';
        } else {
            dateAlert.style.display = 'block';
            dateAlert.innerText = "Data disponível!";
            dateAlert.className = "alert-box success";
            setTimeout(() => { dateAlert.style.display = 'none'; }, 3000);
        }
    } catch (erro) {
        console.error(erro);
    } finally {
        btnSend.innerText = "Verificar e Agendar";
        btnSend.disabled = false;
    }
});

// Atualiza Preço
serviceSelect.addEventListener('change', function() {
    const price = parseFloat(this.value);
    if (price > 0) {
        paymentSection.style.display = 'block';
        const deposit = price * 0.30;
        fullPriceDisplay.innerText = price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        depositPriceDisplay.innerText = deposit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } else {
        paymentSection.style.display = 'none';
    }
});

// Botão Agendar
btnSend.addEventListener('click', async function() {
    // Pega os dados do cliente
    const nome = document.getElementById('clientName').value;
    const tel = document.getElementById('clientPhone').value;
    const endereco = document.getElementById('clientAddress').value;
    const ultimoProc = document.getElementById('lastProcedureDate').value;
    
    const date = dateInput.value;
    const time = timeInput.value;
    const select = serviceSelect;
    const serviceName = select.options[select.selectedIndex].text;
    const price = parseFloat(select.value);

    // Validação
    if (!date || !time || price === 0 || !nome || !tel || !endereco || !ultimoProc) {
        alert("Por favor, preencha TODOS os campos, incluindo a data do último procedimento.");
        return;
    }

    btnSend.disabled = true;
    btnSend.innerText = "Salvando...";

    try {
        const ocupado = await verificarDisponibilidade(date);
        
        if (ocupado) {
            alert("Data ocupada neste momento.");
            return;
        }

        // Salva no Firebase
        await addDoc(collection(db, "agendamentos"), {
            cliente: nome,
            telefone: tel,
            endereco: endereco,
            ultimoProcedimento: ultimoProc,
            data: date,
            horario: time,
            servico: serviceName,
            valor: price,
            criadoEm: new Date().toISOString()
        });

        // Prepara mensagem WhatsApp
        const dataAgendamentoBR = formatDataBR(date);
        const dataUltimoProcBR = formatDataBR(ultimoProc);
        const depositValue = (price * 0.30).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const message = `Olá! Sou *${nome}* e fiz um agendamento no site.\n\n` +
                        `🗓 *Data Agendada:* ${dataAgendamentoBR} às ${time}\n` +
                        `💇🏾‍♀️ *Modelo:* ${serviceName}\n` +
                        `💰 *Sinal:* ${depositValue}\n` +
                        `📍 *Moro em:* ${endereco}\n` +
                        `🧴 *Último procedimento:* ${dataUltimoProcBR}\n` +
                        `📱 *Contato:* ${tel}\n\n` +
                        `Aguardo o PIX!`;

        const url = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');

        setTimeout(() => { window.location.reload(); }, 1500);

    } catch (e) {
        console.error("Erro:", e);
        alert("Erro ao agendar. Tente novamente.");
    } finally {
        btnSend.disabled = false;
        btnSend.innerText = "Verificar e Agendar";
    }
});
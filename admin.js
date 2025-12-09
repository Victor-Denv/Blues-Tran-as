import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- COLE SUA CONFIGURAÇÃO AQUI (A MESMA QUE ESTAVA FUNCIONANDO) ---
const firebaseConfig = {
  apiKey: "AIzaSyCQyjnobWfFqYttYOrQ3xoTRq5PutOi38A",
  authDomain: "blues-afrotrancas.firebaseapp.com",
  projectId: "blues-afrotrancas",
  storageBucket: "blues-afrotrancas.firebasestorage.app",
  messagingSenderId: "62126300208",
  appId: "1:62126300208:web:b6cfde8ea643faa9b5a1f5",
  measurementId: "G-GLYHSNHTG5"
};
// ------------------------------------------------------------------

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function formatDataBR(dataString) {
    if(!dataString) return "Data inválida";
    const dataObj = new Date(dataString);
    return new Date(dataObj.valueOf() + dataObj.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
}

window.carregarDados = async function() {
    const listaDiv = document.getElementById('listaAgendamentos');
    listaDiv.innerHTML = '<div style="text-align:center; padding: 40px;"><span class="material-icons" style="font-size: 40px; color: #004aad; animation: spin 1s infinite;">autorenew</span></div>';

    try {
        // Se der erro aqui, remova o , orderBy("data")
        const q = query(collection(db, "agendamentos"), orderBy("data"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            listaDiv.innerHTML = `
                <div style="text-align: center; margin-top: 50px; color: #718096;">
                    <span class="material-icons" style="font-size: 60px; color: #cbd5e0;">event_busy</span>
                    <h3>Nenhum agendamento encontrado</h3>
                    <p>Sua agenda está vazia por enquanto.</p>
                </div>`;
            return;
        }

        let htmlFinal = "";
        let ultimaData = "";
        let cardsBuffer = ""; // Buffer para agrupar cards do mesmo dia

        querySnapshot.forEach((doc) => {
            const dados = doc.data();

            // Tratamento de dados vazios
            const nome = dados.cliente || "Cliente";
            const servico = dados.servico || "Serviço";
            const horario = dados.horario || "--:--";
            const valor = dados.valor ? dados.valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : "R$ 0,00";
            const endereco = dados.endereco || "Não informado";
            const ultimoProc = dados.ultimoProcedimento ? formatDataBR(dados.ultimoProcedimento) : "N/A";
            const telefone = dados.telefone || "";
            const zapLink = telefone ? `https://wa.me/55${telefone.replace(/\D/g,'')}` : "#";
            const dataBR = formatDataBR(dados.data);

            // Verifica se mudou o dia para criar um novo título
            if (dataBR !== ultimaData) {
                // Se não for a primeira data, fecha a grid anterior
                if (ultimaData !== "") {
                    htmlFinal += `<div class="cards-grid">${cardsBuffer}</div>`;
                    cardsBuffer = "";
                }
                
                htmlFinal += `<h3 class="section-title">📅 ${dataBR}</h3>`;
                ultimaData = dataBR;
            }

            // Cria o Cartão Bonito
            cardsBuffer += `
                <div class="admin-card">
                    <div class="card-header">
                        <span class="time-badge">⏰ ${horario}</span>
                        <span class="price-tag">${valor}</span>
                    </div>
                    <div class="card-body">
                        <div class="client-name">${nome}</div>
                        <span class="service-name">${servico}</span>
                        
                        <div class="info-row">
                            <span class="material-icons small">place</span>
                            ${endereco}
                        </div>
                        <div class="info-row">
                            <span class="material-icons small">spa</span>
                            Último proc: ${ultimoProc}
                        </div>
                    </div>
                    <div class="card-footer">
                        <a href="${zapLink}" target="_blank" class="btn-whatsapp-card">
                            <span class="material-icons" style="font-size: 18px;">chat</span>
                            Chamar no WhatsApp
                        </a>
                    </div>
                </div>
            `;
        });

        // Adiciona o último grupo de cards
        htmlFinal += `<div class="cards-grid">${cardsBuffer}</div>`;

        listaDiv.innerHTML = htmlFinal;

    } catch (error) {
        console.error(error);
        listaDiv.innerHTML = `<div class="alert-box error">Erro ao carregar: ${error.message}</div>`;
    }
}
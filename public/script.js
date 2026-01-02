import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

const cF = {  apiKey: "AIzaSyAyRO6BATvqvRJr2sCh-QFW4FoWh_1GBus",
  authDomain: "blues-afrotrancas-v2.firebaseapp.com",
  projectId: "blues-afrotrancas-v2",
  storageBucket: "blues-afrotrancas-v2.firebasestorage.app",
  messagingSenderId: "917785952384",
  appId: "1:917785952384:web:35f8ee3acfeb320ff7a665",
  measurementId: "G-4YS5GP0626"};

  
const fApp = initializeApp(cF);
const fDb = getFirestore(fApp);
const fFns = getFunctions(fApp);
const N_WPP = "557581079652"; 
const URL_CRIAR_PAGAMENTO = "https://us-central1-blues-afrotrancas-v2.cloudfunctions.net/criarPagamentoMP";

const sS = document.getElementById('serviceSelect');
const iD = document.getElementById('dateInput');
const tS = document.getElementById('timeSlot');
const dA = document.getElementById('dateAlert');
const bS = document.getElementById('btnSend');
const pS = document.getElementById('paymentSection');
const fPD = document.getElementById('fullPrice');
const dPD = document.getElementById('depositPrice');
const cAS = document.getElementById('clientAddress');
const dUP = document.getElementById('divUltimoProcedimento');

function fDBR(dS) {
    if(!dS) return "Não informado";
    const dO = new Date(dS);
    return new Date(dO.valueOf() + dO.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
}

cAS.addEventListener('change', function() {
    iD.value = '';
    tS.innerHTML = '<option value="">Data...</option>';
    tS.disabled = true;
});

sS.addEventListener('change', function() {
    const vP = parseFloat(this.value);
    const nS = this.options[this.selectedIndex].text;
    
    if (nS.toLowerCase().includes("manutenção") || nS.toLowerCase().includes("retwist")) {
        dUP.style.display = 'block';
    } else {
        dUP.style.display = 'none';
    }

    if (vP > 0) {
        iD.disabled = false;
        pS.style.display = 'block';
        
        const d = vP * 0.30;
        fPD.innerText = vP.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        dPD.innerText = d.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        iD.value = '';
        tS.innerHTML = '<option value="">Data...</option>';
        tS.disabled = true;
        bS.disabled = true;
    } else {
        pS.style.display = 'none';
        iD.disabled = true;
    }
});

iD.addEventListener('change', async function() {
    const d = this.value;
    const o = sS.options[sS.selectedIndex];
    const tSrv = o.getAttribute('data-tipo');
    const cCli = cAS.value;

    if (!cCli) { alert("Selecione sua cidade primeiro."); this.value = ""; return; }
    if (!d || !tSrv) return;

    tS.innerHTML = '<option>Verificando...</option>';
    tS.disabled = true;
    bS.disabled = true;
    dA.style.display = 'none';

    try {
        const dR = doc(fDb, "disponibilidade", d);
        const dSnap = await getDoc(dR);

        let hI = "08:00";
        let hF = "18:00";
        let lD = "Camaçari - BA"; 

        if (dSnap.exists()) {
            const iD = dSnap.data();
            
            if (iD.tipo === 'folga') {
                mE("Agenda fechada para este dia (Folga).");
                tS.innerHTML = '<option>Indisponível</option>';
                return;
            }

            if (iD.tipo === 'trabalho') {
                hI = iD.inicio;
                hF = iD.fim;
                lD = iD.local;

                if (lD !== cCli) {
                    mE(`Nesta data estarei atendendo em ${lD}.`);
                    tS.innerHTML = '<option>Outra Cidade</option>';
                    return;
                }
            }
        } 
        
        const qA = query(collection(fDb, "agendamentos"), where("data", "==", d), where("status", "==", "agendado"));
        const qSnap = await getDocs(qA);

        let mO = false;
        let tO = false;
        let dIB = false;

        qSnap.forEach((d) => {
            const a = d.data();
            if (a.tipoDuracao === 'longo') dIB = true;
            if (a.periodo === 'manha') mO = true;
            if (a.periodo === 'tarde') tO = true;
        });

        let hO = '<option value="">Selecione...</option>';
        let tV = false;

        if (dIB) {
            mE("Dia já lotado (serviço longo agendado).");
            tS.innerHTML = '<option>Cheio</option>';
            return;
        }

        const pM = ("09:00" >= hI && "09:00" < hF);
        const pT = ("14:00" >= hI && "14:00" < hF);
        const pDT = ("08:00" >= hI && "18:00" <= hF);

        if (tSrv === 'longo') {
            if (!mO && !tO && pDT) {
                hO += '<option value="08:00" data-periodo="dia_todo">08:00 (Dia Inteiro)</option>';
                tV = true;
            } else {
                if(!pDT) mE("Horário reduzido neste dia.");
                else mE("Dia requer manhã e tarde livres.");
            }
        } else {
            if (!mO && pM) {
                hO += '<option value="09:00" data-periodo="manha">09:00 (Manhã)</option>';
                tV = true;
            }
            if (!tO && pT) {
                hO += '<option value="14:00" data-periodo="tarde">14:00 (Tarde)</option>';
                tV = true;
            }
            if (!tV) mE("Horários ocupados.");
        }

        tS.innerHTML = hO;
        if (tV) { tS.disabled = false; mS("Horários disponíveis!"); }

    } catch (e) { console.error(e); alert("Erro ao verificar agenda."); }
});

function mE(t) { dA.innerText = t; dA.className = "alert-box error"; dA.style.display = 'block'; }
function mS(t) { dA.innerText = t; dA.className = "alert-box success"; dA.style.display = 'block'; }

tS.addEventListener('change', function() { 
    if(this.value) {
        bS.disabled = false; 
        bS.innerText = "Confirmar e Pagar";
    }
});

bS.addEventListener('click', async function() {
    const n = document.getElementById('clientName').value;
    const t = document.getElementById('clientPhone').value;
    const e = document.getElementById('clientAddress').value;
    const uPI = document.getElementById('lastProcedureDate');
    const uP = dUP.style.display !== 'none' ? uPI.value : "Não se aplica";
    
    const d = iD.value;
    const h = tS.value;
    const tO = tS.options[tS.selectedIndex];
    
    if (!tO) { alert("Por favor, selecione um horário."); return; }

    const p = tO.getAttribute('data-periodo');
    const s = sS;
    const nS = s.options[s.selectedIndex].text;
    const tD = s.options[s.selectedIndex].getAttribute('data-tipo');
    const v = parseFloat(s.value);

    if (!d || !h || !n || !t) { alert("Preencha todos os campos."); return; }

    // Usando as variáveis do DOM
    const tP = document.querySelector('input[name="paymentType"]:checked').value;
    // O input 'payMethod' não existe no HTML fornecido, então 'mP' será 'pix'
    const mPInput = document.querySelector('input[name="payMethod"]:checked');
    const mP = mPInput ? mPInput.value : 'pix'; 
    
    bS.innerText = "Gerando Link...";
    bS.disabled = true;

    try {
        const dR = await addDoc(collection(fDb, "agendamentos"), {
            cliente: n, 
            telefone: t, 
            endereco: e, 
            ultimoProcedimento: uP,
            data: d, 
            horario: h, 
            periodo: p, 
            tipoDuracao: tD,
            servico: nS, 
            valor: v, 
            
            tipoPagamento: tP,
            metodoPreferido: mP,
            statusFinanceiro: "Aguardando Pagamento",

            status: "agendado", 
            pixConfirmado: false, 
            criadoEm: new Date().toISOString()
        });
        
        // 1. CALCULA O VALOR CORRETO (Sinal ou Total)
        const valorTotal = v;
        const valorSinal = v * 0.30;
        const valorParaPagamento = tP === 'sinal' ? valorSinal : valorTotal;

        // 2. CRIA O ARRAY 'items' NO FORMATO EXIGIDO PELO MERCADO PAGO
        const items = [{
            title: `${nS} - ${n}`, // Ex: "Box Braids - Vítor da silva lopes"
            unit_price: parseFloat(valorParaPagamento.toFixed(2)), // Garante 2 casas decimais e tipo number
            quantity: 1,
            currency_id: 'BRL'
        }];


        // Chamada HTTP para a Função V2 com formatação de items
        const response = await fetch(URL_CRIAR_PAGAMENTO, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                items: items, // NOVO FORMATO DE REQUISIÇÃO
                tipo: tP,
                agendamentoId: dR.id,
                modoPagamento: mP
            })
        });

        const rData = await response.json(); // O JSON de retorno do Mercado Pago

        if (!response.ok) {
            // Se a resposta HTTP falhar (status 400 ou 500)
            throw new Error(rData.error || `Erro HTTP: ${response.status} - ${rData.message || 'Erro Desconhecido'}`);
        }
        
        const lP = rData.init_point;
        
        if (lP) {
            window.location.href = lP;
        } else {
            throw new Error("O link de pagamento não foi gerado pelo servidor.");
        }

    } catch (e) { 
        console.error(e); 
        alert("Erro ao processar. Tente novamente ou entre em contato. (Verifique o console para detalhes)"); 
        bS.disabled = false; 
        bS.innerText = "Confirmar e Pagar";
    }
});

window.abrirModal = function() {
    const mC = document.getElementById('modalConsulta');
    mC.style.display = 'flex';
    setTimeout(() => { mC.classList.add('ativo'); }, 10);
}

window.fecharModal = function() {
    const mC = document.getElementById('modalConsulta');
    mC.classList.remove('ativo');
    setTimeout(() => { mC.style.display = 'none'; }, 300);
}

window.onclick = function(e) {
    const mC = document.getElementById('modalConsulta');
    if (e.target == mC) { window.fecharModal(); }
}

window.buscarAgendamentos = async function() {
    const tI = document.getElementById('searchPhone').value;
    const rD = document.getElementById('resultadoBusca');
    if(!tI) { alert("Digite seu número."); return; }
    rD.innerHTML = '<p style="color:#aaa; text-align:center;">Buscando...</p>';

    try {
        const q = query(collection(fDb, "agendamentos"), where("telefone", "==", tI), where("status", "==", "agendado"));
        const qSnap = await getDocs(q);

        if (qSnap.empty) {
            rD.innerHTML = '<p style="color:#fca5a5; text-align:center;">Nenhum agendamento ativo.</p>';
            return;
        }

        let h = "";
        qSnap.forEach((d) => {
            const data = d.data();
            const dO = new Date(data.data);
            const dBR = new Date(dO.valueOf() + dO.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
            let sH = data.pixConfirmado ? `<span class="status-badge badge-verde">✅ Confirmado</span>` : `<span class="status-badge badge-amarelo">🟡 Aguardando Pagamento</span>`;
            let cB = data.pixConfirmado ? "confirmado" : "pendente";

            h += `<div class="status-card ${cB}">${sH}<h4 style="color:#fff; margin: 5px 0;">${data.servico}</h4><p style="color:#ccc;">📅 ${dBR} às ${data.horario}</p></div>`;
        });
        rD.innerHTML = h;
    } catch (e) { console.error(e); rD.innerHTML = '<p>Erro ao buscar. Verifique as permissões de leitura.</p>'; }
}


window.addEventListener('load', function() {
    const uP = new URLSearchParams(window.location.search);
    const s = uP.get('status');
    const pI = uP.get('payment_id');

    if (s === 'aprovado') {
        window.history.replaceState({}, document.title, window.location.pathname);

        const mS = document.createElement('div');
        mS.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%;background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);display: flex; justify-content: center; align-items: center; z-index: 10000;animation: fadeIn 0.5s ease;`;

        mS.innerHTML = `
            <div class="modal-content glass-effect" style="text-align:center; border: 2px solid #10b981; max-width: 400px; padding: 30px; border-radius: 20px; background: #111827;">
                <div style="font-size: 4rem; margin-bottom: 10px;">🎉</div>
                <h2 style="color: #10b981; margin: 10px 0; font-size: 1.8rem;">Pagamento Aprovado!</h2>
                <p style="color: #e2e8f0; margin-bottom: 20px; font-size: 1.1rem;">Seu horário está garantido na agenda.</p>
                
                <div style="background: rgba(16, 185, 129, 0.1); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <p style="color: #fff; font-size: 0.9rem; margin-bottom: 5px;">Agora, avise a gente no WhatsApp para confirmar os detalhes:</p>
                </div>

                <button id="btnZapSucesso" style="
                    background: #25D366; color: white; border: none; padding: 16px 25px; 
                    border-radius: 50px; font-weight: bold; font-size: 1.1rem; cursor: pointer;
                    display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%;
                    box-shadow: 0 4px 15px rgba(37, 211, 102, 0.4); transition: transform 0.2s;
                ">
                    <span class="material-icons">chat</span> Chamar no WhatsApp
                </button>
                
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: transparent; border: none; color: #94a3b8; 
                    margin-top: 20px; font-size: 0.9rem; cursor: pointer; text-decoration: underline;
                ">Fechar e ver agenda</button>
            </div>
        `;

        document.body.appendChild(mS);

        const b = document.getElementById('btnZapSucesso');
        b.onmouseover = () => b.style.transform = 'scale(1.05)';
        b.onmouseout = () => b.style.transform = 'scale(1)';

        b.onclick = function() {
            const m = `Oiii! 😍 Acabei de pagar meu agendamento pelo site e foi aprovado! 🎉 (Cod: ${pI || 'Web'})`;
            window.open(`https://wa.me/${N_WPP}?text=${encodeURIComponent(m)}`, '_blank');
            mS.remove();
        };
    } 
    else if (s === 'falha') {
        alert("Ops! O pagamento não foi confirmado. Tente novamente.");
    }
});
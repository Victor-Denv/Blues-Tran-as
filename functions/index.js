/**
 * IMPORTANTE:
 * ESTE CÓDIGO TEM UM RISCO DE SEGURANÇA AO INJETAR O TOKEN DIRETAMENTE.
 * USE APENAS PARA TESTE. DEPOIS, REVERTA PARA O USO DE SECRETS.
 *
 * PARA FUNCIONAR:
 * Substitua 'SEU_TOKEN_DE_PRODUÇÃO_AQUI' pelo Access Token de PRODUÇÃO (APP_USR-...).
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const mercadopago = require("mercadopago");
const {defineSecret} = require("firebase-functions/params");

// Define o segredo do Mercado Pago. (Mantemos esta linha, mas não a usaremos no teste)
const MERCADO_PAGO_TOKEN = defineSecret("MERCADO_PAGO_TOKEN");

// Inicialização do Firebase Admin
admin.initializeApp();

// =========================================================================
// FUNÇÃO 1: CRIAR PAGAMENTO (HTTP Request)
// =========================================================================
exports.criarPagamentoMP = onRequest({
    region: 'us-central1',
    // Não precisamos dos segredos, mas vamos mantê-los por precaução
    secrets: [MERCADO_PAGO_TOKEN] 
}, async (request, response) => {

    if (request.method !== 'POST') {
        response.status(405).send('Método Não Permitido. Use POST.');
        return;
    }

    // ====================================================================
    // 🚨 AQUI ESTÁ O CÓDIGO DE TESTE INSEGURO
    // SUBSTITUA 'SEU_TOKEN_DE_PRODUÇÃO_AQUI' PELO TOKEN APP_USR- CORRETO
    // ====================================================================
    const ACCESS_TOKEN_INSEGURO = 'APP_USR-1799892045705276-121116-a94d7f567e331b8ede5fdb63b6593084-2406218767'; 
    mercadopago.configure({
        access_token: ACCESS_TOKEN_INSEGURO,
    });
    // ====================================================================

    const body = request.body;

    const URL_BASE = "https://blues-afrotrancas.web.app";
    const URL_WEBHOOK = "https://us-central1-blues-afrotrancas.cloudfunctions.net/receberNotificacaoMP";
    
    // Definição da preferência de pagamento (agora usando o array 'items' do frontend)
    const preference = {
        items: body.items, // Recebemos o array 'items' formatado do script.js
        back_urls: {
            success: `${URL_BASE}/index.html?status=aprovado&payment_id=${body.agendamentoId}`,
            failure: `${URL_BASE}/index.html?status=falha`,
            pending: `${URL_BASE}/index.html?status=pendente`
        },
        auto_return: "approved",
        notification_url: URL_WEBHOOK,
        external_reference: body.agendamentoId // Passa o ID do agendamento para o Webhook
    };

    try {
        const result = await mercadopago.preferences.create(preference);
        response.status(200).send(result.body);
    } catch (error) {
        logger.error("Erro ao criar preferência de pagamento:", error);
        response.status(500).send({
            error: error.message || "Erro interno no servidor.",
            details: error
        });
    }
});


// =========================================================================
// FUNÇÃO 2: RECEBER NOTIFICAÇÃO (WEBHOOK)
// =========================================================================
exports.receberNotificacaoMP = onRequest({
    region: 'us-central1',
    secrets: [MERCADO_PAGO_TOKEN] 
}, async (request, response) => {
    
    // Usamos o token seguro aqui, pois esta função não está em teste
    const accessToken = MERCADO_PAGO_TOKEN.value();
    mercadopago.configure({
        access_token: accessToken,
    });
    
    const topic = request.query.topic || request.query.type;
    const id = request.query.id || request.query['data.id'];

    if (!topic || !id) {
        logger.warn("Notificação recebida sem tópico ou ID", request.query);
        response.status(400).send("Parâmetros inválidos.");
        return;
    }

    if (topic === 'payment') {
        try {
            const payment = await mercadopago.payment.findById(id);
            const status = payment.body.status;
            const externalReference = payment.body.external_reference; // Nosso agendamentoId
            
            logger.info(`Pagamento ID ${id} - Status: ${status} | Agendamento ID: ${externalReference}`);
            
            if (status === 'approved' && externalReference) {
                await admin.firestore().collection('agendamentos').doc(externalReference).update({ 
                    statusFinanceiro: "Aprovado",
                    pixConfirmado: true,
                    paymentIdMP: id
                });
            }

        } catch (error) {
            logger.error(`Erro ao processar notificação de pagamento ID ${id}:`, error);
            response.status(500).send('Erro interno ao processar');
            return;
        }
    }

    response.status(200).send('OK');
});
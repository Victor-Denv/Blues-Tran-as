/**
 * IMPORTANTE:
 * Este código NÃO usa o sistema seguro de chaves (defineSecret).
 * O token deve ser configurado como uma variável de ambiente (ex: process.env.MERCADO_PAGO_TOKEN)
 * com o comando 'firebase functions:config:set mercadopago.token="SEU_TOKEN"'.
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const mercadopago = require("mercadopago");
// REMOVIDO: const {defineSecret} = require("firebase-functions/params"); 

// Inicialização do Firebase Admin
admin.initializeApp();

// =========================================================================
// FUNÇÃO 1: CRIAR PAGAMENTO (HTTP Request)
// =========================================================================
exports.criarPagamentoMP = onRequest({
    region: 'us-central1',
    // REMOVIDO: secrets: [MERCADO_PAGO_TOKEN] 
}, async (request, response) => {

    if (request.method !== 'POST') {
        response.status(405).send('Método Não Permitido. Use POST.');
        return;
    }

    // LENDO O TOKEN DA VARIÁVEL DE AMBIENTE PADRÃO
    const accessToken = process.env.MERCADO_PAGO_TOKEN; 
    mercadopago.configure({
        access_token: accessToken,
    });
    
    const body = request.body;

    const URL_BASE = "https://blues-afrotrancas.web.app";
    const URL_WEBHOOK = "https://us-central1-blues-afrotrancas.cloudfunctions.net/receberNotificacaoMP";
    
    // Definição da preferência de pagamento (espera o array 'items' formatado do frontend)
    const preference = {
        items: body.items, // Recebemos o array 'items' formatado do script.js
        back_urls: {
            success: `${URL_BASE}/index.html?status=aprovado&payment_id=${body.agendamentoId}`,
            failure: `${URL_BASE}/index.html?status=falha`,
            pending: `${URL_BASE}/index.html?status=pendente`
        },
        auto_return: "approved",
        notification_url: URL_WEBHOOK,
        external_reference: body.agendamentoId 
    };
    
    // 🚨 NOVO LOG CRÍTICO PARA DEBUG:
    logger.info("Tentativa de Pagamento Recebida - Detalhes:", { 
        TokenUsado: accessToken ? accessToken.substring(0, 10) + '...' : 'TOKEN VAZIO',
        ItemsEnviados: body.items,
        AgendamentoID: body.agendamentoId 
    });
    // ------------------------------------

    try {
        const result = await mercadopago.preferences.create(preference);
        response.status(200).send(result.body);
    } catch (error) {
        // Esta linha agora registrará o erro exato do Mercado Pago
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
    // REMOVIDO: secrets: [MERCADO_PAGO_TOKEN] 
}, async (request, response) => {
    
    const accessToken = process.env.MERCADO_PAGO_TOKEN; // LENDO O TOKEN DA VARIÁVEL DE AMBIENTE PADRÃO
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
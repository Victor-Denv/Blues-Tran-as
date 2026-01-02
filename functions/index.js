const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { MercadoPagoConfig, Preference } = require("mercadopago");

// Inicia o Firebase (Firestore já é detectado automaticamente)
admin.initializeApp();
const db = admin.firestore();

// 🔑 COLOQUE SEU TOKEN DO MERCADO PAGO AQUI
const client = new MercadoPagoConfig({ accessToken: 'SEU_ACCESS_TOKEN_AQUI' });

exports.criarPagamentoMP = onRequest({ cors: true }, async (req, res) => {
    try {
        const dados = req.body; 

        // Validação básica
        if (!dados.valor || !dados.nome) {
            return res.status(400).json({ error: "Dados incompletos" });
        }

        // 1. Prepara o agendamento
        // Cria uma referência vazia para gerar o ID antes de salvar
        const docRef = db.collection('agendamentos').doc();
        
        const novoAgendamento = {
            id: docRef.id, // ID único gerado pelo Firestore
            cliente: dados.nome,
            telefone: dados.telefone,
            servico: dados.servico,
            data: dados.data,
            horario: dados.horario,
            valor: parseFloat(dados.valor),
            status: "pendente",
            criadoEm: new Date().toISOString()
        };

        // 2. Salva no Firestore
        await docRef.set(novoAgendamento);

        // 3. Cria o link de pagamento no Mercado Pago
        const preference = new Preference(client);
        
        const body = {
            items: [
                {
                    id: docRef.id,
                    title: `Agendamento - ${dados.servico}`,
                    quantity: 1,
                    unit_price: parseFloat(dados.valor)
                }
            ],
            payer: {
                name: dados.nome
            },
            external_reference: docRef.id, // Liga o pagamento ao agendamento
            back_urls: {
                success: "https://blues-afrotrancas-v2.web.app/sucesso",
                failure: "https://blues-afrotrancas-v2.web.app/",
                pending: "https://blues-afrotrancas-v2.web.app/"
            },
            auto_return: "approved"
        };

        const result = await preference.create({ body });

        // Devolve o link para o site
        res.json({ 
            id: result.id, 
            init_point: result.init_point, 
            sandbox_init_point: result.sandbox_init_point 
        });

    } catch (error) {
        logger.error("Erro no pagamento:", error);
        res.status(500).json({ error: error.message });
    }
});
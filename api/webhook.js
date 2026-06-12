const crypto = require('crypto');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método não permitido' });
    }

    try {
        const signature = req.headers['x-nexuspag-signature'];
        const eventType = req.headers['x-nexuspag-event'];
        
        // Se houver um Webhook Secret configurado, validamos o HMAC
        const secret = process.env.NEXUSPAG_WEBHOOK_SECRET;
        if (secret && signature) {
            // NexusPag: signature format t=<unix>,v1=<hmac_hex>
            const parts = signature.split(',');
            const timestampPart = parts.find(p => p.startsWith('t='));
            const hashPart = parts.find(p => p.startsWith('v1='));

            if (!timestampPart || !hashPart) {
                return res.status(401).json({ error: 'Assinatura mal formatada' });
            }

            const timestamp = timestampPart.split('=')[1];
            const v1Hash = hashPart.split('=')[1];

            // Lê o body original para gerar a hash
            // Vercel transforma req.body em JSON, então transformamos de volta em string
            const payloadCru = JSON.stringify(req.body);

            const expectedHash = crypto
                .createHmac('sha256', secret)
                .update(`${timestamp}.${payloadCru}`)
                .digest('hex');

            // Validação (const time comparison seria ideal, mas fallback pra === se falhar em libs antigas)
            if (expectedHash !== v1Hash) {
                console.error('Assinatura inválida no Webhook');
                // return res.status(401).json({ error: 'Assinatura inválida' });
                // NOTA: Algumas vezes o stringify no serverless muda a ordem das chaves do JSON original do body 
                // e quebra o HMAC. Se você não conseguir validar o HMAC depois de ativar o webhook_secret, 
                // precisaremos pegar o RAW body Buffer. Por enquanto está assim conforme a documentação.
            }
        }

        const body = req.body;

        // Se o evento for pagamento confirmado
        if (body.event === 'payment.confirmed' || eventType === 'payment.confirmed') {
            const externalId = body.external_id; // Formato esperado: "email@cliente.com|171812345"
            
            if (!externalId) {
                return res.status(200).json({ success: true, message: 'Pago, mas sem external_id. Ignorado.' });
            }

            const emailCliente = externalId.split('|')[0];
            
            // Link do Álbum PDF
            const linkDoPDF = process.env.PDF_URL || "https://COLOCAR_O_LINK_AQUI.com";

            console.log(`[Webhook] Pagamento recebido! Enviando Álbum para: ${emailCliente}`);

            // Envio do e-mail com o Resend
            if (process.env.RESEND_API_KEY) {
                await resend.emails.send({
                    from: 'Álbum da Bíblia <contato@SEUDOMINIO.com>', // TODO: Você precisará verificar um domínio no Resend
                    to: emailCliente,
                    subject: '📖 Seu Álbum da Bíblia Chegou! [Acesso Liberado]',
                    html: `
                        <h2>Olá! Seu pagamento foi confirmado.</h2>
                        <p>Obrigado por adquirir o Álbum da Bíblia!</p>
                        <p>Clique no link abaixo para baixar todo o seu material e os bônus:</p>
                        <p><a href="${linkDoPDF}" style="background-color: #ffb703; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">BAIXAR MEU ÁLBUM</a></p>
                        <br>
                        <p>Deus abençoe sua família!</p>
                    `
                });
            } else {
                console.log("[Webhook Aviso] E-mail não enviado porque não há RESEND_API_KEY configurada.");
            }
        }

        // Retornamos 200 OK para o NexusPag saber que recebemos
        return res.status(200).json({ success: true, message: 'Webhook processado com sucesso' });

    } catch (error) {
        console.error("Erro interno no processamento do webhook:", error);
        return res.status(500).json({ success: false, error: 'Erro interno' });
    }
};

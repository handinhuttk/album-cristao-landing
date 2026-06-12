module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método não permitido' });
    }

    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ success: false, error: 'Nome e E-mail são obrigatórios' });
    }

    try {
        // Enviar requisição para a NexusPag
        const apiKey = process.env.NEXUSPAG_API_KEY;
        const webhookUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}/api/webhook` 
            : 'https://sua-url-na-vercel.vercel.app/api/webhook'; // Placeholder ou Ngrok em dev

        // O external_id será usado para guardar o email do cliente (para o envio na hora do webhook)
        const timestamp = Date.now();
        const externalId = `${email}|${timestamp}`;

        const payload = {
            amount: 29.90,
            description: "Álbum da Bíblia",
            external_id: externalId,
            webhook_url: webhookUrl,
            expiration: 1800 // 30 minutos
        };

        const response = await fetch('https://nexuspag.com/api/pix/create', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("NexusPag Error:", data);
            return res.status(500).json({ success: false, error: 'Erro no gateway de pagamento' });
        }

        // Se for sucesso, devolve apenas os dados necessários para o frontend
        return res.status(200).json({
            success: true,
            transaction: {
                id: data.transaction.id,
                pix_copia_cola: data.transaction.pix_copia_cola,
                qr_code_base64: data.transaction.qr_code_base64
            }
        });

    } catch (error) {
        console.error("Erro interno no checkout:", error);
        return res.status(500).json({ success: false, error: 'Erro interno no servidor' });
    }
};

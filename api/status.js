module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Método não permitido' });
    }

    const transactionId = req.query.id;

    if (!transactionId) {
        return res.status(400).json({ success: false, error: 'ID da transação não fornecido' });
    }

    try {
        const apiKey = process.env.NEXUSPAG_API_KEY;

        const response = await fetch(`https://nexuspag.com/api/pix/${transactionId}`, {
            method: 'GET',
            headers: {
                'x-api-key': apiKey
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(500).json({ success: false, error: 'Erro ao consultar status' });
        }

        return res.status(200).json({
            success: true,
            status: data.status // 'pending', 'paid', 'expired', 'cancelled'
        });

    } catch (error) {
        console.error("Erro interno no status:", error);
        return res.status(500).json({ success: false, error: 'Erro interno no servidor' });
    }
};

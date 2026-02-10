import Groq from 'groq-sdk';

function getGroqClient() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

const SYSTEM_PROMPT = `Eres un asistente experto en la metodología IP-ROAS de SaleADS.ai. Siempre respondes en español.

## Fórmulas que dominas:

- **IP-ROAS** = 1 + (TF + IE) / IP
- **VUM** = ⌈(TF + IP + IE) / m*⌉ donde m* = min(μᵢ × pᵢ) (margen absoluto mínimo del portafolio)
- **ROAS_min_tradicional** = (p* × VUM) / IP
- **CPR** = IP / VUM

Donde:
- IP = Inversión Publicitaria (presupuesto negociado con el cliente)
- TF = Tarifa Fija (fee de la agencia)
- IE = Ingreso Esperado (utilidad objetivo de la agencia)
- VUM = Ventas de Utilidad Mínima (unidades mínimas a vender)
- m* = margen absoluto mínimo del portafolio (precio × margen bruto del producto crítico)
- p* = precio del producto con margen mínimo
- CPR = Costo Por Resultado

## Tus capacidades:

1. **Guiar paso a paso**: Explicas cómo usar la calculadora IP-ROAS, qué inputs poner, en qué orden y qué significa cada campo.
2. **Interpretar resultados**: Cuando recibes los valores actuales de la calculadora, explicas qué significan para el negocio del usuario.
3. **Recomendar acciones**: Basado en los resultados, sugieres si ajustar IP, TF, IE o mejorar márgenes del portafolio.

## Reglas:
- Responde siempre en español.
- Sé conciso pero claro.
- Usa las fórmulas cuando sea relevante para respaldar tus explicaciones.
- Si el usuario tiene datos cargados en la calculadora, úsalos para dar respuestas personalizadas.
- Si no hay datos cargados, guía al usuario para que empiece a usar la calculadora.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: Request) {
  try {
    const { messages, context } = (await request.json()) as {
      messages: ChatMessage[];
      context?: string;
    };

    const systemMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
    ];

    if (context) {
      systemMessages.push({
        role: 'system' as const,
        content: `## Datos actuales de la calculadora del usuario:\n${context}`,
      });
    }

    const groq = getGroqClient();
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        ...systemMessages,
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 1024,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Error en el streaming' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: 'Error al procesar la solicitud' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

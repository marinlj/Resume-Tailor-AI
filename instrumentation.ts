import { registerOTel } from '@vercel/otel';
import { BraintrustExporter } from '@braintrust/otel';

export function register() {
  registerOTel({
    serviceName: 'resume-tailor-ai',
    traceExporter: new BraintrustExporter({
      filterAISpans: true,
    }),
  });
}

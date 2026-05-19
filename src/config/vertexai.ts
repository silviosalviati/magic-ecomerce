import { Storage } from '@google-cloud/storage';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

type PredictionPayload = Record<string, unknown>;

function getGeneratedImageFromPrediction(prediction: PredictionPayload): {
  base64: string;
  mimeType: string;
} {
  const direct = prediction['bytesBase64Encoded'] || prediction['bytesBase64'];

  const imageObj = (prediction['image'] && typeof prediction['image'] === 'object'
    ? (prediction['image'] as Record<string, unknown>)
    : null);

  const nested = imageObj
    ? imageObj['bytesBase64Encoded'] || imageObj['bytesBase64']
    : undefined;

  const base64 = String(direct || nested || '').trim();
  if (!base64) {
    const availableKeys = Object.keys(prediction).join(', ') || '(sem chaves)';
    throw new Error(`Resposta da API não contém imagem codificada. Chaves retornadas: ${availableKeys}`);
  }

  const mimeType = String(
    prediction['mimeType'] ||
      (imageObj ? imageObj['mimeType'] : '') ||
      'image/jpeg'
  );

  return { base64, mimeType };
}

function resolveGoogleCredentialsPath(): string | undefined {
  const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (fromEnv) return fromEnv;

  const localFallback = path.resolve(__dirname, '../../secrets/gcp-key.json');
  if (fs.existsSync(localFallback)) return localFallback;

  return undefined;
}

function getProjectId(): string {
  return process.env.GCP_PROJECT_ID || 'magic-ecomerce';
}

function createStorageClient(projectId: string): Storage {
  const keyFilename = resolveGoogleCredentialsPath();
  return new Storage({
    projectId,
    keyFilename,
  });
}

async function downloadImageAsBase64(bucketName: string, objectPath: string): Promise<string> {
  const projectId = getProjectId();
  const storage = createStorageClient(projectId);

  const bucket = storage.bucket(bucketName);
  const file = bucket.file(objectPath);

  const [buffer] = await file.download();
  return buffer.toString('base64');
}

async function getAccessToken(): Promise<string> {
  const { GoogleAuth } = await import('google-auth-library');
  const projectId = getProjectId();
  const keyFilename = resolveGoogleCredentialsPath();
  const auth = new GoogleAuth({
    projectId,
    keyFilename,
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
  });
  const client = await auth.getClient();
  const credentials = await client.getAccessToken();
  return credentials.token || '';
}

export async function generateMannequinPreview(params: {
  barcode: string;
  frontImagePath: string;
  backImagePath: string;
  bucketName?: string;
  productContext?: {
    name?: string;
    category?: string;
    description?: string;
    color?: string;
    size?: string;
  };
}): Promise<{ previewUrl: string; generatedPath: string }> {
  const {
    barcode,
    frontImagePath,
    backImagePath,
    bucketName = 'magic-ecommerce-fotos',
    productContext,
  } = params;

  try {
    // Download imagens do bucket
    const frontImageBase64 = await downloadImageAsBase64(bucketName, frontImagePath);
    const backImageBase64 = await downloadImageAsBase64(bucketName, backImagePath);

    const projectId = getProjectId();
    const accessToken = await getAccessToken();

    const rawCategory = String(productContext?.category || '').toLowerCase();
    const rawName = String(productContext?.name || '').toLowerCase();
    const rawDescription = String(productContext?.description || '').toLowerCase();
    const garmentText = `${rawCategory} ${rawName} ${rawDescription}`;

    let mannequinGuidance =
      'Use a full neutral mannequin for complete garments with realistic studio framing.';

    if (/blusa|camisa|camiseta|top|regata|jaqueta|moletom|casaco/.test(garmentText)) {
      mannequinGuidance =
        'Use an upper-body mannequin (torso mannequin) focused on tops, keeping natural neckline, shoulders and sleeve drape.';
    } else if (/calca|calça|short|bermuda|saia|legging/.test(garmentText)) {
      mannequinGuidance =
        'Use a lower-body mannequin focused on pants/skirts/shorts, preserving waist, hip and leg silhouette.';
    } else if (/vestido|macaquinho|macacao|macacão|jardineira/.test(garmentText)) {
      mannequinGuidance =
        'Use a full-body mannequin suitable for one-piece garments, preserving overall silhouette and proportions.';
    }

    // Chamar Imagen API via REST
    const prompt = `Create a photorealistic e-commerce mannequin preview for this apparel item.
Product category: ${productContext?.category || 'not provided'}.
Product name: ${productContext?.name || 'not provided'}.
Color: ${productContext?.color || 'not provided'}.
Size: ${productContext?.size || 'not provided'}.
Description: ${productContext?.description || 'not provided'}.

${mannequinGuidance}

STRICT FIDELITY RULES:
- Keep the garment design faithful to the photographed item.
- Preserve color tone, prints, seams, cuts, collar, sleeves, waistband and texture.
- Do not invent logos, patterns, pockets or accessories that are not present.
- Keep a neutral studio background and professional e-commerce lighting.
- Front-facing composition, mannequin centered, garment fully visible.`;

    const endpoint =
      `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-fast-generate-001:predict`;

    const requestConfig = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    let response;
    try {
      // Tenta modo image-conditioned: usa a peça real do bucket para manter fidelidade.
      response = await axios.post(
        endpoint,
        {
          instances: [
            {
              prompt,
              image: {
                bytesBase64Encoded: frontImageBase64,
                mimeType: 'image/jpeg',
              },
              referenceImages: [
                {
                  referenceType: 'REFERENCE_ONLY',
                  referenceImage: {
                    bytesBase64Encoded: backImageBase64,
                    mimeType: 'image/jpeg',
                  },
                },
              ],
            },
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: '3:4',
          },
        },
        requestConfig
      );
    } catch (imageConditionedError) {
      const shouldFallback =
        axios.isAxiosError(imageConditionedError) &&
        (imageConditionedError.response?.status === 400 || imageConditionedError.response?.status === 404);

      if (!shouldFallback) {
        throw imageConditionedError;
      }

      // Fallback para modo somente prompt caso o modelo/projeto não aceite campos de referência.
      response = await axios.post(
        endpoint,
        {
          instances: [
            {
              prompt,
            },
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: '3:4',
          },
        },
        requestConfig
      );
    }

    if (!response.data.predictions || response.data.predictions.length === 0) {
      throw new Error('Imagen não gerou nenhuma imagem');
    }

    const firstPrediction = response.data.predictions[0] as PredictionPayload;
    const generated = getGeneratedImageFromPrediction(firstPrediction);

    const contentType = 'image/png';

    const imageBuffer = Buffer.from(generated.base64, 'base64');

    // Salvar imagem gerada no bucket
    const storage = createStorageClient(projectId);

    const bucket_instance = storage.bucket(bucketName);
    const previewFileName = `${barcode}_Review.png`;
    const previewPath = `produtos/${barcode}/${previewFileName}`;
    const file = bucket_instance.file(previewPath);

    await file.save(imageBuffer, {
      metadata: {
        contentType,
      },
    });

    const publicBaseUrl = process.env.GCP_PUBLIC_BASE_URL?.trim() || `https://storage.googleapis.com/${bucketName}`;
    const previewUrl = `${publicBaseUrl}/${encodeURIComponent(previewPath)}`;

    return {
      previewUrl,
      generatedPath: previewPath,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const apiMessage = String((error.response.data as any)?.error?.message || error.message);

      if (status === 403) {
        throw new Error(
          `Erro ao gerar preview: permissão negada no Vertex AI (403). ${apiMessage}. Verifique GCP_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS e se a service account tem o papel Vertex AI User (roles/aiplatform.user).`
        );
      }

      throw new Error(`Erro ao gerar preview: Vertex AI retornou ${status}. ${apiMessage}`);
    }

    throw new Error(
      `Erro ao gerar preview: ${error instanceof Error ? error.message : 'Desconhecido'}`
    );
  }
}

export interface GenerateRenderParams {
  engine?: 'gemini';
  characterName: string;
  characterTheme: string;
  productName: string;
  gradeCode: string;
  viscosity: string;
  backgroundColor: string;
  characterImageBase64?: string;
  bottleImageBase64?: string;
  customPromptExtra?: string;
}

export interface GenerateRenderResponse {
  success: boolean;
  imageUrl?: string;
  prompt?: string;
  error?: string;
}

/**
 * Calls server-side Gemini API to generate a photorealistic 3D render of the robot
 * holding the product bottle on an illuminated pedestal.
 */
export async function generateRealisticCharacterRender(
  params: GenerateRenderParams
): Promise<GenerateRenderResponse> {
  try {
    const response = await fetch('/api/ai/generate-character-render', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || `Generation failed with status ${response.status}`);
    }

    return data;
  } catch (err: any) {
    console.error('Error generating AI character render:', err);
    return {
      success: false,
      error: err?.message || 'Failed to connect to AI generation service.',
    };
  }
}

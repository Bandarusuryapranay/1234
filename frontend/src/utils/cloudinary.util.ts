import { proctoringApi } from '../services/api.services'

export const uploadToCloudinary = async (file: File | Blob | string, folder: string = 'smarthire_uploads'): Promise<string> => {
  // 1. Get signature from backend
  const { signature, timestamp, apiKey, cloudName } = await proctoringApi.getCloudinarySignature({ folder })

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`

  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)
  formData.append('signature', signature)
  formData.append('timestamp', timestamp)
  formData.append('api_key', apiKey)

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error?.message || 'Failed to upload to Cloudinary')
  }

  const data = await response.json()
  return data.secure_url
}

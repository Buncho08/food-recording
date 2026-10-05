function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('この画像形式を読み込めませんでした。別の写真を選んでください。'))
    }

    image.src = url
  })
}

export async function compressImage(file: File, maxSize = 1600, quality = 0.82): Promise<Blob> {
  const image = await loadImage(file)
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('画像を処理できませんでした')

  ctx.drawImage(image, 0, 0, width, height)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('画像をJPEGに変換できませんでした'))
    }, 'image/jpeg', quality)
  })
}

import { supabase } from '../lib/supabaseConfig'
import imageCompression from 'browser-image-compression'

class StorageService {
  constructor() {
    this.bucketName = 'quiz-images'
    this.maxFileSize = 5 * 1024 * 1024 // 5MB en bytes
    this.maxWidth = 1200 // Ancho máximo de imagen
    this.maxHeight = 800 // Alto máximo de imagen
    this.quality = 0.8 // Calidad de compresión (0.8 = 80%)
  }

  // Subir imagen al storage
  async uploadImage(file, fileName = null) {
    try {
      // Comprimir imagen si es necesario
      const processedFile = await this.compressImage(file)
      
      // Generar nombre único para el archivo
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 15)
      const extension = processedFile.name.split('.').pop()
      const finalFileName = fileName || `admin/${timestamp}_${randomId}.${extension}`

      // Subir archivo al bucket
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(finalFileName, processedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('❌ Error subiendo imagen:', error)
        throw error
      }


      // Obtener URL pública de la imagen
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(finalFileName)


      return {
        success: true,
        fileName: finalFileName,
        publicUrl: urlData.publicUrl,
        path: data.path,
        originalSize: file.size,
        processedSize: processedFile.size
      }
    } catch (error) {
      console.error('❌ Error en uploadImage:', error)
      throw error
    }
  }

  // Eliminar imagen del storage
  async deleteImage(fileName) {
    try {

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .remove([fileName])

      if (error) {
        console.error('❌ Error eliminando imagen:', error)
        throw error
      }

      return { success: true, data }
    } catch (error) {
      console.error('❌ Error en deleteImage:', error)
      throw error
    }
  }

  // Obtener lista de imágenes del bucket
  async listImages(folder = 'admin') {
    try {

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(folder, {
          limit: 100,
          offset: 0
        })

      if (error) {
        console.error('❌ Error listando imágenes:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('❌ Error en listImages:', error)
      throw error
    }
  }

  // Obtener URL pública de una imagen
  getPublicUrl(fileName) {
    const { data } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(fileName)
    
    return data.publicUrl
  }

  // Validar tipo de archivo
  validateFileType(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    return allowedTypes.includes(file.type)
  }

  // Comprimir imagen si es necesario
  async compressImage(file) {
    try {

      // Si la imagen es menor a 5MB, no comprimir
      if (file.size <= this.maxFileSize) {
        return file
      }

      // Opciones de compresión
      const options = {
        maxSizeMB: 5,
        maxWidthOrHeight: Math.max(this.maxWidth, this.maxHeight),
        useWebWorker: true,
        fileType: file.type,
        quality: this.quality
      }


      // Comprimir imagen
      const compressedFile = await imageCompression(file, options)
      

      return compressedFile
    } catch (error) {
      console.error('❌ Error comprimiendo imagen:', error)
      // Si falla la compresión, devolver el archivo original
      return file
    }
  }

  // Validar tamaño de archivo (máximo 5MB)
  validateFileSize(file, maxSizeMB = 5) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    return file.size <= maxSizeBytes
  }

  // Validar archivo completo
  validateFile(file) {
    const errors = []

    if (!this.validateFileType(file)) {
      errors.push('Tipo de archivo no permitido. Solo se permiten: JPEG, PNG, GIF, WebP')
    }

    // Ya no validamos el tamaño máximo porque lo comprimimos automáticamente
    // if (!this.validateFileSize(file)) {
    //   errors.push(`El archivo es muy grande. Máximo permitido: 5MB`)
    // }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

export default new StorageService()

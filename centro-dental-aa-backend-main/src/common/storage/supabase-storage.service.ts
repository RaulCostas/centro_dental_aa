import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SupabaseStorageService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly useLocal: boolean = false;
  private readonly uploadsDir = path.resolve(process.cwd(), 'uploads');

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      this.logger.warn('[SupabaseStorageService] SUPABASE_URL or SUPABASE_KEY is not defined. Falling back to LOCAL storage.');
      this.useLocal = true;
      if (!fs.existsSync(this.uploadsDir)) {
        fs.mkdirSync(this.uploadsDir, { recursive: true });
      }
    } else {
      this.supabase = createClient(url, key);
    }
  }

  private sanitizePath(pathStr: string): string {
    return pathStr
      .toLowerCase()
      .replace(/\s+/g, '-')           // Reemplaza espacios con guiones
      .replace(/[^a-z0-9\-\/\.]/g, '') // Elimina caracteres no permitidos
      .replace(/-+/g, '-')            // Evita guiones múltiples
      .trim();
  }

  async uploadFile(bucket: string, fullPath: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    const cleanPath = this.sanitizePath(fullPath);
    
    if (this.useLocal) {
      this.logger.log(`[SupabaseStorageService] Saving LOCALLY to ${bucket}/${cleanPath}...`);
      const targetPath = path.join(this.uploadsDir, bucket, cleanPath);
      const targetDir = path.dirname(targetPath);
      
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      fs.writeFileSync(targetPath, fileBuffer);
      
      // Return a local URL (the frontend needs to be able to serve this)
      // We assume /uploads is served statically
      const apiUrl = process.env.VITE_API_URL || 'http://localhost:3000';
      return `${apiUrl}/uploads/${bucket}/${cleanPath}`;
    }

    this.logger.log(`[SupabaseStorageService] Uploading to Supabase ${bucket}/${cleanPath}...`);
    
    if (!this.supabase) {
      this.logger.error('[SupabaseStorageService] Supabase client is not initialized!');
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(cleanPath, fileBuffer, { contentType, upsert: true });

    if (error) {
      this.logger.error(`Error uploading to Supabase (${bucket}/${cleanPath}): ${error.message}`);
      throw error;
    }

    const { data: { publicUrl } } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(cleanPath);

    return publicUrl;
  }

  async uploadBase64(bucket: string, fullPath: string, base64String: string): Promise<string> {
    const match = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) {
      if (base64String.startsWith('http')) return base64String;
      throw new Error('Invalid Base64 string format');
    }

    const extension = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const contentType = `image/${extension}`;
    
    let fileName = fullPath;
    if (!fileName.endsWith(`.${extension}`)) {
      fileName = `${fullPath}-${Date.now()}.${extension}`;
    }

    return this.uploadFile(bucket, fileName, buffer, contentType);
  }

  async deleteFile(bucket: string, url: string): Promise<void> {
    if (this.useLocal) {
      // Extract path from local URL
      const pathPart = url.split('/uploads/').pop();
      if (!pathPart) return;
      const localPath = path.join(this.uploadsDir, pathPart.replace(`${bucket}/`, ''));
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
      return;
    }

    const relativePath = url.split(`${bucket}/`).pop();
    if (!relativePath) return;

    const { error } = await this.supabase.storage.from(bucket).remove([relativePath]);
    if (error) {
      this.logger.error(`Error deleting from Supabase: ${error.message}`);
    }
  }
}

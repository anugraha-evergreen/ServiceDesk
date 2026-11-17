'use client';

import React, { useState } from 'react';
import { UploadedDoc } from '@/lib/types';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface DirectDriveUploaderProps {
  plotNumber: string;
  category: UploadedDoc['category'];
  label: string;
  required?: boolean;
  description?: string;
  existingDoc?: UploadedDoc;
  onUploadComplete: (doc: UploadedDoc) => void;
}

export const DirectDriveUploader: React.FC<DirectDriveUploaderProps> = ({
  plotNumber,
  category,
  label,
  required = false,
  description,
  existingDoc,
  onUploadComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [completedDoc, setCompletedDoc] = useState<UploadedDoc | undefined>(existingDoc);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setErrorMsg(null);
    setProgress(0);
    setUploading(true);

    try {
      // 1. Request Resumable Session URL from Next.js server route
      const initRes = await fetch('/api/drive/initiate-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selected.name,
          mimeType: selected.type || 'application/octet-stream',
          fileSizeBytes: selected.size,
          plotNumber,
          category,
        }),
      });

      if (!initRes.ok) {
        const err = await initRes.json();
        throw new Error(err.error || 'Failed to initiate Drive upload');
      }

      const { uploadUrl, fileId, folderPath, isMock } = await initRes.json();

      // 2. Direct browser-to-Drive chunked PUT upload (bypassing Vercel's 4.5MB limit)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', selected.type || 'application/octet-stream');

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 100);
            setProgress(pct);
          }
        };

        xhr.onload = () => {
          // Google Drive Resumable upload returns 200 or 201 when complete
          if (xhr.status >= 200 && xhr.status < 300) {
            setProgress(100);
            resolve();
          } else {
            reject(new Error(`Upload failed with status code ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during direct upload'));
        xhr.send(selected);
      });

      const newDoc: UploadedDoc = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        category,
        label,
        fileName: selected.name,
        fileSizeBytes: selected.size,
        mimeType: selected.type || 'application/octet-stream',
        driveFileId: fileId || `drive-${Date.now()}`,
        driveWebViewLink: isMock
          ? `https://drive.google.com/file/d/mock-${category}-${plotNumber}/view`
          : undefined, // Only filled if available
        uploadedAt: new Date().toISOString(),
      };

      setCompletedDoc(newDoc);
      onUploadComplete(newDoc);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      console.error(err);
      setErrorMsg(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 transition-all hover:border-emerald-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div>
          <span className="font-semibold text-xs sm:text-sm text-gray-900 flex items-center gap-1.5">
            {label}
            {required && <span className="text-rose-500 font-bold">*</span>}
          </span>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>

        {completedDoc && !uploading && (
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium self-start sm:self-auto">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Uploaded ({formatFileSize(completedDoc.fileSizeBytes)})</span>
          </div>
        )}
      </div>

      {/* Uploading progress state */}
      {uploading && (
        <div className="space-y-2 my-2">
          <div className="flex items-center justify-between text-xs text-emerald-800">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              Uploading directly to Drive...
            </span>
            <span className="font-mono font-bold">{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error display */}
      {errorMsg && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 my-2 bg-rose-50 p-2 rounded-lg border border-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Input controller */}
      {!completedDoc && !uploading && (
        <label className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-xl p-4 cursor-pointer transition">
          <UploadCloud className="w-6 h-6 text-emerald-600 mb-1" />
          <span className="text-xs font-semibold text-emerald-900">
            Tap to select or take photo
          </span>
          <span className="text-[11px] text-gray-500 mt-0.5">
            PDF, JPG, PNG (Unlimited file size via Drive resumable upload)
          </span>
          <input
            type="file"
            accept=".pdf,image/png,image/jpeg,image/jpg"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      )}

      {/* Re-upload option */}
      {completedDoc && !uploading && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500 font-mono truncate max-w-[200px] sm:max-w-[300px]">
            {completedDoc.fileName}
          </span>
          <label className="text-xs text-emerald-700 font-medium hover:underline cursor-pointer">
            Replace File
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg,image/jpg"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>
      )}
    </div>
  );
};

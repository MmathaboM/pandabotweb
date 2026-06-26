import api from "./api";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface UserDocument {
  id: number;
  type: string;
  original_filename: string;
  file_path?: string;
  file_url: string | null;
  url?: string;
  mime_type?: string;
  size?: number;
  size_formatted?: string;
  status?: string;
  is_verified?: boolean;
  created_at: string;
}

export interface DocumentType {
  value: string;
  label: string;
  category: string;
  is_required?: boolean;
}

export interface DocumentCheckResult {
  hasUploadedAllDocuments: boolean;
  missingDocuments: string[];
  requiredDocuments: string[];
  completionPercentage: number;
}

// ── Service ────────────────────────────────────────────────────────────────────
export const documentsService = {
  /**
   * Fetch all documents uploaded by the current user.
   */
  getMyDocuments: async (): Promise<UserDocument[]> => {
    try {
      const response = await api.get<{
        success: boolean;
        data: UserDocument[];
      }>("v1/profile/documents");
      return response.data.data ?? [];
    } catch (error) {
      console.error("❌ getMyDocuments error:", error);
      return [];
    }
  },

  /**
   * Get all document types (with is_required flag based on user's role).
   */
  getDocumentTypes: async (): Promise<DocumentType[]> => {
    try {
      const response = await api.get<{
        success: boolean;
        document_types: DocumentType[];
        total_types: number;
        required_types?: string[];
        total_required?: number;
      }>("v1/documents/types");
      return response.data.document_types ?? [];
    } catch (error) {
      console.error("❌ getDocumentTypes error:", error);
      return [];
    }
  },

  /**
   * Get only required document types for the current user's role.
   */
  getRequiredDocumentTypes: async (): Promise<DocumentType[]> => {
    try {
      const response = await api.get<{
        success: boolean;
        document_types: DocumentType[];
        required_types: string[];
      }>("v1/documents/types");
      const allTypes = response.data.document_types ?? [];
      return allTypes.filter((t) => t.is_required === true);
    } catch (error) {
      console.error("❌ getRequiredDocumentTypes error:", error);
      return [];
    }
  },

  /**
   * Get full requirements details including disability documents.
   */
  getDocumentRequirements: async (): Promise<{
    regular: DocumentType[];
    disability: DocumentType[];
  }> => {
    try {
      const response = await api.get<{
        success: boolean;
        data: { regular: DocumentType[]; disability: DocumentType[] };
      }>("v1/documents/my-requirements");
      return response.data.data ?? { regular: [], disability: [] };
    } catch (error) {
      console.error("❌ getDocumentRequirements error:", error);
      return { regular: [], disability: [] };
    }
  },

  /**
   * Check document completion status for the current user.
   */
  checkDocuments: async (): Promise<DocumentCheckResult> => {
    try {
      const response = await api.get<
        DocumentCheckResult & { success: boolean }
      >("v1/documents/check");

      const toArray = (val: unknown): string[] =>
        Array.isArray(val)
          ? val
          : val && typeof val === "object"
            ? Object.values(val as Record<string, string>)
            : [];

      return {
        hasUploadedAllDocuments: response.data.hasUploadedAllDocuments ?? false,
        missingDocuments: toArray(response.data.missingDocuments),
        requiredDocuments: toArray(response.data.requiredDocuments),
        completionPercentage: response.data.completionPercentage ?? 0,
      };
    } catch (error) {
      console.error("❌ checkDocuments error:", error);
      return {
        hasUploadedAllDocuments: false,
        missingDocuments: [],
        requiredDocuments: [],
        completionPercentage: 0,
      };
    }
  },

  uploadDocument: async (
    documentType: string,
    file: File,
  ): Promise<UserDocument> => {
    const formData = new FormData();
    formData.append("document", file, file.name);
    formData.append("document_type", documentType);

    // Debug: log file info (no loop, avoids TypeScript issue)
    console.log("📤 Uploading:", documentType, file.name, `${file.size} bytes`);

    const response = await api.post<{ success: boolean; data: UserDocument }>(
      "v1/documents/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data", 
        },
      },
    );

    const doc = response.data.data;
    return {
      ...doc,
      url: doc.file_url ?? undefined,
    };
  },
  /**
   * Delete a document by ID.
   */
  deleteDocument: async (documentId: number): Promise<void> => {
    await api.delete(`v1/profile/documents/${documentId}`);
  },
};

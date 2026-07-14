import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  FileText, UploadCloud, Trash2, PenTool, Send, RotateCcw,
  FileSignature, CheckCircle2, Clock3, FilePen, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, BadgeVariant } from '../../components/ui/Badge';
import { SignaturePad } from '../../components/documents/SignaturePad';
import { useAuth } from '../../context/AuthContext';

type DocStatus = 'draft' | 'in_review' | 'signed';

interface ChamberDocument {
  id: string;
  name: string;
  kind: 'pdf' | 'doc';
  size: string;
  uploadedAt: string;
  status: DocStatus;
  /** Blob URL for user-uploaded files; seeded documents render a mock preview instead. */
  url?: string;
  signature?: {
    dataUrl: string;
    signedBy: string;
    signedAt: string;
  };
}

const statusConfig: Record<DocStatus, { label: string; variant: BadgeVariant; icon: React.ReactNode }> = {
  draft: { label: 'Draft', variant: 'gray', icon: <FilePen size={14} /> },
  in_review: { label: 'In Review', variant: 'warning', icon: <Clock3 size={14} /> },
  signed: { label: 'Signed', variant: 'success', icon: <CheckCircle2 size={14} /> },
};

const seedDocuments: ChamberDocument[] = [
  {
    id: 'seed-1',
    name: 'Series A Term Sheet.pdf',
    kind: 'pdf',
    size: '1.2 MB',
    uploadedAt: '2026-07-10',
    status: 'in_review',
  },
  {
    id: 'seed-2',
    name: 'Mutual NDA.pdf',
    kind: 'pdf',
    size: '340 KB',
    uploadedAt: '2026-07-02',
    status: 'draft',
  },
  {
    id: 'seed-3',
    name: 'Investment Agreement.docx',
    kind: 'doc',
    size: '2.1 MB',
    uploadedAt: '2026-06-28',
    status: 'draft',
  },
];

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Mock rendered contract for seeded documents that have no real file behind them. */
const MockDocumentPreview: React.FC<{ doc: ChamberDocument }> = ({ doc }) => (
  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 max-w-2xl mx-auto text-sm text-gray-700 space-y-4">
    <div className="text-center border-b border-gray-200 pb-4">
      <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wide">
        {doc.name.replace(/\.(pdf|docx?)$/i, '')}
      </h3>
      <p className="text-xs text-gray-500 mt-1">Business Nexus · Confidential</p>
    </div>
    <p>
      This agreement ("Agreement") is entered into by and between the parties identified on the
      signature page hereto, effective as of the date of last signature (the "Effective Date").
    </p>
    <p>
      <span className="font-semibold">1. Purpose.</span> The parties wish to explore a potential
      business relationship and investment opportunity, in connection with which each party may
      disclose certain confidential and proprietary information.
    </p>
    <p>
      <span className="font-semibold">2. Terms.</span> The specific commercial terms, valuation,
      and closing conditions are set forth in Schedule A attached hereto and incorporated by
      reference.
    </p>
    <p>
      <span className="font-semibold">3. Governing Law.</span> This Agreement shall be governed by
      and construed in accordance with applicable law, without regard to conflict of law principles.
    </p>
    <div className="pt-6 grid grid-cols-2 gap-8">
      <div>
        <p className="text-xs text-gray-500 mb-1">Signature</p>
        {doc.signature ? (
          <img src={doc.signature.dataUrl} alt="Signature" className="h-16 object-contain" />
        ) : (
          <div className="h-16 border-b-2 border-gray-300" />
        )}
        <p className="text-xs text-gray-500 mt-1 border-t border-gray-200 pt-1">
          {doc.signature ? `${doc.signature.signedBy} · ${doc.signature.signedAt}` : 'Awaiting signature'}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">Date</p>
        <div className="h-16 flex items-end pb-1 font-medium">
          {doc.signature?.signedAt ?? ''}
        </div>
        <div className="border-t border-gray-200" />
      </div>
    </div>
  </div>
);

export const DocumentChamberPage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<ChamberDocument[]>(seedDocuments);
  const [selectedId, setSelectedId] = useState<string>(seedDocuments[0].id);
  const [filter, setFilter] = useState<DocStatus | 'all'>('all');
  const [signingDocId, setSigningDocId] = useState<string | null>(null);
  const blobUrlsRef = useRef<string[]>([]);

  useEffect(() => () => {
    blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
  }, []);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length === 0) {
      toast.error('Only PDF and Word documents are supported');
      return;
    }
    const newDocs: ChamberDocument[] = accepted.map((file, i) => {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const url = URL.createObjectURL(file);
      blobUrlsRef.current.push(url);
      return {
        id: `upload-${Date.now()}-${i}`,
        name: file.name,
        kind: isPdf ? 'pdf' : 'doc',
        size: formatFileSize(file.size),
        uploadedAt: format(new Date(), 'yyyy-MM-dd'),
        status: 'draft' as const,
        url,
      };
    });
    setDocuments(prev => [...newDocs, ...prev]);
    setSelectedId(newDocs[0].id);
    toast.success(`${accepted.length} document${accepted.length > 1 ? 's' : ''} uploaded`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  const counts = useMemo(() => ({
    draft: documents.filter(d => d.status === 'draft').length,
    in_review: documents.filter(d => d.status === 'in_review').length,
    signed: documents.filter(d => d.status === 'signed').length,
  }), [documents]);

  const visibleDocuments = filter === 'all'
    ? documents
    : documents.filter(d => d.status === filter);

  const selectedDoc = documents.find(d => d.id === selectedId) ?? null;
  const signingDoc = documents.find(d => d.id === signingDocId) ?? null;

  const updateStatus = (id: string, status: DocStatus, message: string) => {
    setDocuments(prev => prev.map(d => (d.id === id ? { ...d, status } : d)));
    toast.success(message);
  };

  const applySignature = (dataUrl: string) => {
    if (!signingDocId || !user) return;
    const signedAt = format(new Date(), 'MMM d, yyyy');
    setDocuments(prev => prev.map(d => (
      d.id === signingDocId
        ? { ...d, status: 'signed' as const, signature: { dataUrl, signedBy: user.name, signedAt } }
        : d
    )));
    setSigningDocId(null);
    toast.success('Document signed');
  };

  const deleteDocument = (id: string) => {
    const doc = documents.find(d => d.id === id);
    if (doc?.url) URL.revokeObjectURL(doc.url);
    setDocuments(prev => {
      const next = prev.filter(d => d.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? '');
      return next;
    });
    toast('Document deleted', { icon: '🗑️' });
  };

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Document Chamber</h1>
        <p className="text-gray-600">Upload, review, and e-sign deal documents in one place</p>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-4">
        {(Object.keys(statusConfig) as DocStatus[]).map(status => (
          <button
            key={status}
            onClick={() => setFilter(filter === status ? 'all' : status)}
            className={`text-left rounded-lg border p-4 transition-colors duration-200 ${
              filter === status
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{statusConfig[status].label}</span>
              <span className="text-gray-400">{statusConfig[status].icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{counts[status]}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column: upload + list */}
        <div className="lg:col-span-2 space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200 ${
              isDragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 bg-white hover:border-primary-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud size={32} className="mx-auto text-primary-600" />
            <p className="mt-2 text-sm font-medium text-gray-900">
              {isDragActive ? 'Drop files here…' : 'Drag & drop documents here'}
            </p>
            <p className="text-xs text-gray-500 mt-1">or click to browse · PDF, DOC, DOCX</p>
          </div>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Documents {filter !== 'all' && `· ${statusConfig[filter].label}`}
              </h2>
              {filter !== 'all' && (
                <Button variant="ghost" size="xs" onClick={() => setFilter('all')}>
                  Show all
                </Button>
              )}
            </CardHeader>
            <CardBody className="space-y-1 max-h-[28rem] overflow-y-auto">
              {visibleDocuments.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-6">No documents in this state</p>
              )}
              {visibleDocuments.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedId(doc.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors duration-200 ${
                    selectedId === doc.id ? 'bg-primary-50 ring-1 ring-primary-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="p-2 bg-primary-50 rounded-lg shrink-0">
                    <FileText size={20} className="text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-500">{doc.size} · {doc.uploadedAt}</p>
                  </div>
                  <Badge variant={statusConfig[doc.status].variant} size="sm">
                    {statusConfig[doc.status].label}
                  </Badge>
                </button>
              ))}
            </CardBody>
          </Card>
        </div>

        {/* Right column: preview + workflow */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            {selectedDoc ? (
              <>
                <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-lg font-medium text-gray-900 truncate">{selectedDoc.name}</h2>
                    <Badge variant={statusConfig[selectedDoc.status].variant} size="sm">
                      {statusConfig[selectedDoc.status].label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedDoc.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<Send size={16} />}
                        onClick={() => updateStatus(selectedDoc.id, 'in_review', 'Submitted for review')}
                      >
                        Submit for Review
                      </Button>
                    )}
                    {selectedDoc.status === 'in_review' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<RotateCcw size={16} />}
                          onClick={() => updateStatus(selectedDoc.id, 'draft', 'Moved back to draft')}
                        >
                          Back to Draft
                        </Button>
                        <Button
                          size="sm"
                          leftIcon={<PenTool size={16} />}
                          onClick={() => setSigningDocId(selectedDoc.id)}
                        >
                          Sign Document
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="p-2 text-error-600 hover:text-error-700"
                      aria-label="Delete document"
                      onClick={() => deleteDocument(selectedDoc.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </CardHeader>
                <CardBody className="bg-gray-50">
                  {selectedDoc.signature && (
                    <div className="mb-4 flex items-center gap-2 text-sm text-success-700 bg-success-50 border border-success-500/20 rounded-lg px-3 py-2">
                      <CheckCircle2 size={16} />
                      Signed by {selectedDoc.signature.signedBy} on {selectedDoc.signature.signedAt}
                    </div>
                  )}
                  {selectedDoc.url && selectedDoc.kind === 'pdf' ? (
                    <iframe
                      src={selectedDoc.url}
                      title={selectedDoc.name}
                      className="w-full h-[32rem] rounded-lg border border-gray-200 bg-white"
                    />
                  ) : selectedDoc.url ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                      <FileText size={48} className="text-gray-300" />
                      <p className="mt-3 text-sm font-medium text-gray-700">{selectedDoc.name}</p>
                      <p className="text-xs mt-1">Inline preview is only available for PDF files</p>
                    </div>
                  ) : (
                    <MockDocumentPreview doc={selectedDoc} />
                  )}
                </CardBody>
              </>
            ) : (
              <CardBody className="flex flex-col items-center justify-center py-24 text-gray-500">
                <FileSignature size={48} className="text-gray-300" />
                <p className="mt-3 text-sm">Select or upload a document to preview it</p>
              </CardBody>
            )}
          </Card>
        </div>
      </div>

      {/* Signature modal */}
      {signingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg animate-slide-in">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Sign Document</h3>
                <p className="text-sm text-gray-500 truncate">{signingDoc.name}</p>
              </div>
              <button
                onClick={() => setSigningDocId(null)}
                aria-label="Close"
                className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-4">
              <SignaturePad onConfirm={applySignature} onCancel={() => setSigningDocId(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

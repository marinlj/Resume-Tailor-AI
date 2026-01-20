'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RenameFormProps {
  currentTitle: string;
  onRename: (newTitle: string) => void;
  onCancel: () => void;
  loading: boolean;
  error?: string | null;
}

// Separate form component that resets when remounted
function RenameForm({ currentTitle, onRename, onCancel, loading, error }: RenameFormProps) {
  const [title, setTitle] = useState(currentTitle);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onRename(title.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Chat title"
        autoFocus
        disabled={loading}
      />
      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
      <DialogFooter className="mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !title.trim()}>
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTitle: string;
  onRename: (newTitle: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function RenameDialog({
  open,
  onOpenChange,
  currentTitle,
  onRename,
  loading = false,
  error,
}: RenameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename chat</DialogTitle>
        </DialogHeader>
        {open && (
          <RenameForm
            currentTitle={currentTitle}
            onRename={onRename}
            onCancel={() => onOpenChange(false)}
            loading={loading}
            error={error}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

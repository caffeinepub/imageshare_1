import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft,
  FolderOpen,
  FolderPlus,
  Globe,
  Images,
  Lock,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  Album,
  Image as BackendImage,
  backendInterface,
} from "../backend";

// ──────────────────────────────────────────────────────────────────────────────
// AlbumFormDialog
// ──────────────────────────────────────────────────────────────────────────────
export function AlbumFormDialog({
  open,
  album,
  actor,
  onClose,
  onSaved,
}: {
  open: boolean;
  album?: Album | null;
  actor: backendInterface | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (album) {
      setName(album.name);
      setDescription(album.description);
      setIsPublic(album.isPublic);
      setPassword("");
    } else {
      setName("");
      setDescription("");
      setIsPublic(true);
      setPassword("");
    }
  }, [album]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Album name is required.");
      return;
    }
    if (!actor) return;
    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        description: description.trim(),
        isPublic,
        password: isPublic ? "" : password,
      };
      if (album) {
        await actor.updateAlbum(album.id, input);
        toast.success("Album updated!");
      } else {
        await actor.createAlbum(input);
        toast.success("Album created!");
      }
      onSaved();
      onClose();
    } catch {
      toast.error("Failed to save album.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-ocid="album.dialog"
        className="bg-card border-border/50"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {album ? "Edit Album" : "New Album"}
          </DialogTitle>
          <DialogDescription className="font-body text-muted-foreground">
            {album
              ? "Update your album settings."
              : "Create a new collection for your images."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="album-name" className="font-body font-medium">
              Album Name
            </Label>
            <Input
              id="album-name"
              data-ocid="album.input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer 2024"
              className="bg-background border-border/50 font-body"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="album-desc" className="font-body font-medium">
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="album-desc"
              data-ocid="album.textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this collection…"
              rows={2}
              className="bg-background border-border/50 font-body resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              data-ocid="album.switch"
              id="album-public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
            <Label
              htmlFor="album-public"
              className="font-body text-sm cursor-pointer flex items-center gap-2"
            >
              {isPublic ? (
                <>
                  <Globe className="w-4 h-4 text-primary" /> Public album
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-muted-foreground" /> Private
                  album
                </>
              )}
            </Label>
          </div>

          {!isPublic && (
            <div className="space-y-2">
              <Label htmlFor="album-password" className="font-body font-medium">
                Password
              </Label>
              <Input
                id="album-password"
                data-ocid="album.input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  album ? "Leave blank to keep current" : "Set a password"
                }
                className="bg-background border-border/50 font-body"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              data-ocid="album.cancel_button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-border/50 font-body"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid="album.save_button"
              disabled={saving}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-body"
            >
              {saving ? "Saving…" : album ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// AlbumPasswordDialog
// ──────────────────────────────────────────────────────────────────────────────
export function AlbumPasswordDialog({
  open,
  onClose,
  onUnlock,
}: {
  open: boolean;
  onClose: () => void;
  onUnlock: (password: string) => void;
}) {
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUnlock(password);
    setPassword("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-ocid="album.dialog"
        className="bg-card border-border/50"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Lock className="w-5 h-5" /> Private Album
          </DialogTitle>
          <DialogDescription className="font-body text-muted-foreground">
            Enter the password to view this album.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <Input
            data-ocid="album.input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="bg-background border-border/50 font-body"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              type="button"
              data-ocid="album.cancel_button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-border/50 font-body"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid="album.confirm_button"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-body"
            >
              Unlock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// AlbumCard
// ──────────────────────────────────────────────────────────────────────────────
function AlbumCard({
  album,
  index,
  isOwner,
  onClick,
  onEdit,
  onDelete,
}: {
  album: Album;
  index: number;
  isOwner: boolean;
  onClick: (album: Album) => void;
  onEdit?: (album: Album) => void;
  onDelete?: (album: Album) => void;
}) {
  return (
    <button
      type="button"
      data-ocid={`album.item.${index + 1}`}
      className="group bg-card rounded-xl border border-border/30 overflow-hidden hover:border-border/60 transition-all cursor-pointer w-full text-left"
      onClick={() => onClick(album)}
    >
      <div className="aspect-[4/3] bg-muted/20 flex items-center justify-center relative">
        <FolderOpen className="w-10 h-10 text-muted-foreground/30" />
        <div className="absolute top-2 right-2">
          {album.isPublic ? (
            <Badge variant="secondary" className="text-xs font-body">
              <Globe className="w-3 h-3 mr-1" />
              Public
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-xs font-body border-border/50"
            >
              <Lock className="w-3 h-3 mr-1" />
              Private
            </Badge>
          )}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-display font-semibold text-sm text-foreground truncate">
          {album.name}
        </h3>
        {album.description && (
          <p className="text-muted-foreground font-body text-xs mt-0.5 line-clamp-2">
            {album.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="flex items-center gap-1 text-xs text-muted-foreground font-body">
            <Images className="w-3 h-3" />
            {album.imageIds.length} images
          </span>
          {isOwner && (
            // biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation helper div
            <div
              className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                data-ocid={`album.edit_button.${index + 1}`}
                onClick={() => onEdit?.(album)}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                data-ocid={`album.delete_button.${index + 1}`}
                onClick={() => onDelete?.(album)}
                className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// AlbumDetailView
// ──────────────────────────────────────────────────────────────────────────────
function AlbumDetailView({
  album,
  actor,
  onBack,
  onImageOpen,
}: {
  album: Album;
  actor: backendInterface | null;
  onBack: () => void;
  onImageOpen: (img: BackendImage) => void;
}) {
  const [albumImages, setAlbumImages] = useState<BackendImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor) return;
    setLoading(true);
    Promise.all(
      album.imageIds.map((id) => actor.getImage(id).catch(() => null)),
    )
      .then((imgs) =>
        setAlbumImages(imgs.filter((img): img is BackendImage => img !== null)),
      )
      .finally(() => setLoading(false));
  }, [actor, album]);

  return (
    <div>
      <button
        type="button"
        data-ocid="album.link"
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-body transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Albums
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <FolderOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            {album.name}
            {album.isPublic ? (
              <Badge variant="secondary" className="text-xs font-body">
                <Globe className="w-3 h-3 mr-1" />
                Public
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs font-body">
                <Lock className="w-3 h-3 mr-1" />
                Private
              </Badge>
            )}
          </h2>
          {album.description && (
            <p className="text-muted-foreground font-body text-sm">
              {album.description}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div
          data-ocid="album.loading_state"
          className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              key={i}
              className="w-full rounded-lg bg-muted/30 animate-pulse"
              style={{ height: "200px" }}
            />
          ))}
        </div>
      ) : albumImages.length === 0 ? (
        <div
          data-ocid="album.empty_state"
          className="border border-dashed border-border/40 rounded-xl p-10 text-center"
        >
          <FolderOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="font-body text-muted-foreground">
            No images in this album yet.
          </p>
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
          {albumImages.map((img, i) => (
            <button
              type="button"
              key={String(img.id)}
              data-ocid={`album.item.${i + 1}`}
              onClick={() => onImageOpen(img)}
              className="group relative overflow-hidden rounded-lg cursor-pointer w-full text-left"
            >
              <div className="w-full aspect-[4/3] relative overflow-hidden">
                {img.blob.getDirectURL() ? (
                  <img
                    src={img.blob.getDirectURL()}
                    alt={img.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 bg-muted/30" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-end p-3">
                  <p className="opacity-0 group-hover:opacity-100 text-white text-xs font-display truncate">
                    {img.title}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// AlbumsTabContent
// ──────────────────────────────────────────────────────────────────────────────
export function AlbumsTabContent({
  actor,
  principal,
  onImageOpen,
}: {
  actor: backendInterface | null;
  principal: string;
  onImageOpen: (img: BackendImage) => void;
}) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);

  const loadAlbums = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const p = Principal.fromText(principal);
      const result = await actor.getUserAlbums(p);
      setAlbums(result);
    } catch {
      toast.error("Failed to load albums.");
    } finally {
      setLoading(false);
    }
  }, [actor, principal]);

  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  const handleDelete = async (album: Album) => {
    if (!actor) return;
    if (!confirm(`Delete album "${album.name}"? This cannot be undone.`))
      return;
    try {
      await actor.deleteAlbum(album.id);
      setAlbums((prev) => prev.filter((a) => a.id !== album.id));
      toast.success("Album deleted.");
    } catch {
      toast.error("Failed to delete album.");
    }
  };

  const handleAlbumClick = (album: Album) => {
    setSelectedAlbum(album);
  };

  if (selectedAlbum) {
    return (
      <AlbumDetailView
        album={selectedAlbum}
        actor={actor}
        onBack={() => setSelectedAlbum(null)}
        onImageOpen={onImageOpen}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-body text-muted-foreground">
          {albums.length} album{albums.length !== 1 ? "s" : ""}
        </p>
        <Button
          data-ocid="album.open_modal_button"
          size="sm"
          onClick={() => {
            setEditingAlbum(null);
            setShowForm(true);
          }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-body text-xs h-8"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> New Album
        </Button>
      </div>

      {loading ? (
        <div
          data-ocid="album.loading_state"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              key={i}
              className="rounded-xl bg-muted/30 animate-pulse h-48"
            />
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div
          data-ocid="album.empty_state"
          className="border border-dashed border-border/40 rounded-xl p-10 text-center"
        >
          <FolderPlus className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="font-body text-muted-foreground">No albums yet.</p>
          <p className="text-muted-foreground/60 text-sm font-body mt-1">
            Create an album to group your images.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {albums.map((album, i) => (
            <AlbumCard
              key={String(album.id)}
              album={album}
              index={i}
              isOwner
              onClick={handleAlbumClick}
              onEdit={(a) => {
                setEditingAlbum(a);
                setShowForm(true);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AlbumFormDialog
        open={showForm}
        album={editingAlbum}
        actor={actor}
        onClose={() => {
          setShowForm(false);
          setEditingAlbum(null);
        }}
        onSaved={loadAlbums}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// AddToAlbumPopover
// ──────────────────────────────────────────────────────────────────────────────
export function AddToAlbumButton({
  imageId,
  actor,
  principal,
}: {
  imageId: bigint;
  actor: backendInterface | null;
  principal: string;
}) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [imageAlbumIds, setImageAlbumIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadAlbums = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const p = Principal.fromText(principal);
      const result = await actor.getUserAlbums(p);
      setAlbums(result);
      const inAlbums = new Set(
        result
          .filter((a) => a.imageIds.some((id) => id === imageId))
          .map((a) => String(a.id)),
      );
      setImageAlbumIds(inAlbums);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [actor, principal, imageId]);

  const handleOpen = () => {
    setOpen(true);
    loadAlbums();
  };

  const toggleAlbum = async (album: Album) => {
    if (!actor) return;
    const idStr = String(album.id);
    const inAlbum = imageAlbumIds.has(idStr);
    try {
      if (inAlbum) {
        await actor.removeImageFromAlbum(album.id, imageId);
        setImageAlbumIds((prev) => {
          const next = new Set(prev);
          next.delete(idStr);
          return next;
        });
        toast.success(`Removed from "${album.name}"`);
      } else {
        await actor.addImageToAlbum(album.id, imageId);
        setImageAlbumIds((prev) => new Set([...prev, idStr]));
        toast.success(`Added to "${album.name}"`);
      }
    } catch {
      toast.error("Failed to update album.");
    }
  };

  return (
    <>
      <Button
        type="button"
        data-ocid="gallery.open_modal_button"
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="border-border/50 font-body text-xs h-8"
      >
        <FolderPlus className="w-3.5 h-3.5 mr-1.5" /> Add to Album
      </Button>

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent
          data-ocid="album.dialog"
          className="bg-card border-border/50"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Add to Album
            </DialogTitle>
            <DialogDescription className="font-body text-muted-foreground">
              Select albums to add or remove this image.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-64">
            {loading ? (
              <p className="text-muted-foreground font-body text-sm py-4 text-center">
                Loading albums…
              </p>
            ) : albums.length === 0 ? (
              <p className="text-muted-foreground font-body text-sm py-4 text-center">
                No albums yet. Create one in your profile.
              </p>
            ) : (
              <div className="space-y-2 py-2">
                {albums.map((album) => {
                  const checked = imageAlbumIds.has(String(album.id));
                  return (
                    <label
                      key={String(album.id)}
                      htmlFor={`album-cb-${String(album.id)}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary cursor-pointer"
                    >
                      <Checkbox
                        id={`album-cb-${String(album.id)}`}
                        data-ocid="album.checkbox"
                        checked={checked}
                        onCheckedChange={() => toggleAlbum(album)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm text-foreground truncate">
                          {album.name}
                        </p>
                        <p className="text-xs text-muted-foreground font-body">
                          {album.imageIds.length} images ·{" "}
                          {album.isPublic ? "Public" : "Private"}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          <Button
            data-ocid="album.close_button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-border/50 font-body"
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

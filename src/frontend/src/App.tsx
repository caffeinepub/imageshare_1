import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bookmark,
  Camera,
  CheckCircle,
  ChevronDown,
  Download,
  Eye,
  Grid3X3,
  Heart,
  Layers,
  Loader2,
  LogOut,
  MessageCircle,
  Search,
  Send,
  Shield,
  Sparkles,
  Upload,
  User,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "./backend";
import type {
  Album,
  Comment as BackendComment,
  Image as BackendImage,
  User as BackendUser,
  PublicUserProfile,
  backendInterface,
} from "./backend";
import { AddToAlbumButton, AlbumsTabContent } from "./components/AlbumFeatures";
import { FilterSortBar } from "./components/FilterSortBar";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";

type Page = "gallery" | "upload" | "profile" | "admin" | "public-profile";

const PRESET_CATEGORIES = [
  "Nature",
  "Anime",
  "Architecture",
  "Travel",
  "Food",
  "Abstract",
  "Animals",
  "Technology",
  "People",
  "Street",
  "Sports",
  "Fashion",
];

function formatNumber(n: bigint | number): string {
  const num = typeof n === "bigint" ? Number(n) : n;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
}

function formatTime(ns: bigint): string {
  const ms = Number(ns / BigInt(1_000_000));
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const FALLBACK_GRADIENTS = [
  "from-amber-900 via-orange-700 to-yellow-500",
  "from-green-950 via-emerald-800 to-teal-600",
  "from-violet-950 via-purple-700 to-pink-500",
  "from-orange-950 via-amber-700 to-yellow-400",
  "from-sky-950 via-blue-700 to-cyan-400",
  "from-rose-950 via-pink-700 to-fuchsia-400",
  "from-stone-900 via-amber-800 to-yellow-600",
  "from-teal-950 via-cyan-700 to-emerald-400",
];

function getGradientForId(id: bigint): string {
  const idx = Number(id % BigInt(FALLBACK_GRADIENTS.length));
  return FALLBACK_GRADIENTS[idx];
}

// ──────────────────────────────────────────────────────────────────────────────
// ImageCard
// ──────────────────────────────────────────────────────────────────────────────
function ImageCard({
  image,
  index,
  onOpen,
  onUserClick,
}: {
  image: BackendImage;
  index: number;
  onOpen: (img: BackendImage) => void;
  onUserClick?: (owner: string) => void;
}) {
  const imgUrl = image.blob.getDirectURL();
  const gradient = getGradientForId(image.id);

  return (
    <button
      type="button"
      className="masonry-item group relative overflow-hidden rounded-lg cursor-pointer w-full text-left"
      style={{ transitionDelay: `${index * 50}ms` }}
      data-ocid={`gallery.item.${index + 1}`}
      onClick={() => onOpen(image)}
    >
      <div
        className={`w-full ${
          image.aspectClass || "aspect-[4/3]"
        } relative overflow-hidden`}
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={image.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`}>
            <div className="absolute inset-0 opacity-20 mix-blend-overlay noise-bg" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex flex-col justify-end p-3">
          <div className="opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
            <p className="text-white font-display text-sm font-semibold leading-tight line-clamp-2">
              {image.title}
            </p>
            <div className="flex items-center gap-3 mt-2 text-white/60 text-xs">
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" /> {formatNumber(image.likes)}
              </span>
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3" /> {formatNumber(image.downloads)}
              </span>
            </div>
            {onUserClick && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUserClick(image.owner.toString());
                }}
                className="mt-1 text-white/50 hover:text-white text-xs underline-offset-2 hover:underline transition-colors"
              >
                View profile
              </button>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// HeroSection
// ──────────────────────────────────────────────────────────────────────────────
function HeroSection({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <div className="relative overflow-hidden py-20 px-4 text-center">
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl bg-gradient-to-br from-orange-600 to-red-700 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-8 blur-3xl bg-gradient-to-br from-amber-600 to-orange-800 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-accent" />
          <span className="text-accent text-sm font-body font-medium tracking-widest uppercase">
            Free for all uses
          </span>
        </div>
        <h1 className="text-5xl md:text-7xl font-display font-bold mb-4 leading-tight">
          <span className="text-gradient">Stunning images</span>
          <br />
          <span className="text-foreground/80">shared freely</span>
        </h1>
        <p className="text-muted-foreground font-body text-lg mb-8 max-w-xl mx-auto">
          Discover and share high-quality images with creators worldwide.
        </p>
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            data-ocid="gallery.search_input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search high-resolution images…"
            className="pl-12 pr-24 h-14 text-base bg-card border-border/50 focus:border-primary rounded-xl"
          />
          <Button
            type="submit"
            data-ocid="gallery.primary_button"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Search
          </Button>
        </form>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {["Nature", "Architecture", "Travel", "Abstract", "People"].map(
            (tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => onSearch(tag.toLowerCase())}
                className="text-xs font-body text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-full border border-border/40 hover:border-border"
              >
                {tag}
              </button>
            ),
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// CommentSection
// ──────────────────────────────────────────────────────────────────────────────
function CommentSection({
  imageId,
  actor,
  isLoggedIn,
  onLoginRequest,
}: {
  imageId: bigint;
  actor: backendInterface | null;
  isLoggedIn: boolean;
  onLoginRequest: () => void;
}) {
  const [comments, setComments] = useState<BackendComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!actor) return;
    setLoading(true);
    actor
      .getComments(imageId)
      .then((c) => setComments(c))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [actor, imageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !actor) return;
    setSubmitting(true);
    try {
      await actor.addComment(imageId, text.trim());
      const updated = await actor.getComments(imageId);
      setComments(updated);
      setText("");
      toast.success("Comment posted!");
    } catch {
      toast.error("Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-4 h-4 text-muted-foreground" />
        <span className="font-body font-medium text-sm text-foreground">
          Comments
          {comments.length > 0 && (
            <span className="ml-1.5 text-muted-foreground font-normal">
              ({comments.length})
            </span>
          )}
        </span>
      </div>

      {loading ? (
        <div
          data-ocid="comments.loading_state"
          className="flex justify-center py-4"
        >
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p
          data-ocid="comments.empty_state"
          className="text-muted-foreground font-body text-sm text-center py-4"
        >
          No comments yet. Be the first!
        </p>
      ) : (
        <ScrollArea className="max-h-52">
          <div className="space-y-3 pr-2">
            {comments.map((c, i) => (
              <div
                key={String(c.id)}
                data-ocid={`comments.item.${i + 1}`}
                className="flex gap-3"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/60 to-accent/60 flex items-center justify-center text-xs font-display font-bold text-white flex-shrink-0">
                  {c.authorUsername.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-body font-semibold text-sm text-foreground">
                      {c.authorUsername}
                    </span>
                    <span className="text-muted-foreground text-xs font-body">
                      {formatTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-foreground/80 font-body text-sm mt-0.5 break-words">
                    {c.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <Separator className="my-4 bg-border/30" />

      {isLoggedIn ? (
        <form
          onSubmit={handleSubmit}
          className="flex gap-2"
          data-ocid="comments.panel"
        >
          <Input
            data-ocid="comments.input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment…"
            className="flex-1 bg-background border-border/40 font-body text-sm h-9"
          />
          <Button
            type="submit"
            data-ocid="comments.submit_button"
            disabled={submitting || !text.trim()}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-3"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </Button>
        </form>
      ) : (
        <button
          type="button"
          onClick={onLoginRequest}
          className="w-full py-2 rounded-lg border border-dashed border-border/40 text-muted-foreground font-body text-sm hover:text-foreground hover:border-border transition-colors"
        >
          Sign in to comment
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ImageDetailDialog
// ──────────────────────────────────────────────────────────────────────────────
function ImageDetailDialog({
  image,
  onClose,
  onDownload,
  actor,
  isLoggedIn,
  likedImages,
  favorites,
  onToggleLike,
  onToggleFavorite,
  onLoginRequest,
  onUserClick,
  userPrincipal,
}: {
  image: BackendImage | null;
  onClose: () => void;
  onDownload: (id: bigint) => void;
  actor: backendInterface | null;
  isLoggedIn: boolean;
  likedImages: Set<string>;
  favorites: Set<string>;
  onToggleLike: (id: bigint, currentlyLiked: boolean) => void;
  onToggleFavorite: (id: bigint, currentlyFavorited: boolean) => void;
  onLoginRequest: () => void;
  onUserClick: (owner: string) => void;
  userPrincipal?: string;
}) {
  if (!image) return null;
  const imgUrl = image.blob.getDirectURL();
  const gradient = getGradientForId(image.id);
  const idStr = String(image.id);
  const isLiked = likedImages.has(idStr);
  const isFavorited = favorites.has(idStr);

  return (
    <Dialog open={!!image} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-ocid="gallery.dialog"
        className="max-w-2xl bg-card border-border/50 p-0 overflow-hidden max-h-[90vh]"
      >
        <ScrollArea className="max-h-[90vh]">
          <div
            className={`w-full aspect-video relative overflow-hidden ${
              !imgUrl ? `bg-gradient-to-br ${gradient}` : ""
            }`}
          >
            {imgUrl ? (
              <img
                src={imgUrl}
                alt={image.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 opacity-20 mix-blend-overlay noise-bg" />
            )}
          </div>
          <div className="p-6">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="font-display text-xl text-foreground">
                    {image.title}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground font-body mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onUserClick(image.owner.toString());
                      }}
                      className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
                    >
                      {image.owner.toString().slice(0, 12)}…
                    </button>
                  </DialogDescription>
                </div>
                {/* Favorite button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        data-ocid="gallery.toggle"
                        onClick={() => {
                          if (!isLoggedIn) {
                            onLoginRequest();
                            return;
                          }
                          onToggleFavorite(image.id, isFavorited);
                        }}
                        variant="ghost"
                        size="icon"
                        className={`flex-shrink-0 ${
                          isFavorited
                            ? "text-accent hover:text-accent/80"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Bookmark
                          className="w-5 h-5"
                          fill={isFavorited ? "currentColor" : "none"}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isFavorited
                        ? "Remove from favorites"
                        : "Add to favorites"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </DialogHeader>

            <div className="flex flex-wrap gap-2 mt-4">
              {image.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="font-body text-xs bg-secondary/60"
                >
                  #{tag}
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-6 mt-5 text-muted-foreground text-sm font-body">
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" /> {formatNumber(image.views)} views
              </span>
              <span className="flex items-center gap-1.5">
                <Heart className="w-4 h-4" /> {formatNumber(image.likes)} likes
              </span>
              <span className="flex items-center gap-1.5">
                <Download className="w-4 h-4" /> {formatNumber(image.downloads)}{" "}
                downloads
              </span>
            </div>

            <div className="flex gap-3 mt-5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      data-ocid="gallery.confirm_button"
                      onClick={() => {
                        if (!isLoggedIn) {
                          onLoginRequest();
                          return;
                        }
                        onToggleLike(image.id, isLiked);
                      }}
                      variant="outline"
                      className={`flex-1 border-border/50 font-body ${
                        isLiked ? "text-rose-400 border-rose-400/40" : ""
                      }`}
                    >
                      <Heart
                        className="w-4 h-4 mr-2"
                        fill={isLiked ? "currentColor" : "none"}
                      />
                      {isLiked ? "Liked" : "Like"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isLiked ? "Unlike this image" : "Like this image"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {imgUrl && (
                <Button
                  data-ocid="gallery.secondary_button"
                  onClick={() => onDownload(image.id)}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-body"
                >
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
              )}
            </div>
            {isLoggedIn && userPrincipal && actor && (
              <div className="flex justify-end mt-3">
                <AddToAlbumButton
                  imageId={image.id}
                  actor={actor}
                  principal={userPrincipal}
                />
              </div>
            )}

            {actor && (
              <CommentSection
                imageId={image.id}
                actor={actor}
                isLoggedIn={isLoggedIn}
                onLoginRequest={onLoginRequest}
              />
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// GalleryPage
// ──────────────────────────────────────────────────────────────────────────────
function GalleryPage({
  images,
  loading,
  onImageOpen,
  onUserClick,
}: {
  images: BackendImage[];
  loading: boolean;
  onImageOpen: (img: BackendImage) => void;
  onUserClick: (owner: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredImages, setFilteredImages] = useState<BackendImage[]>(images);

  const searchFiltered = searchQuery
    ? filteredImages.filter(
        (img) =>
          img.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          img.tags.some((t) =>
            t.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      )
    : filteredImages;

  const filtered = searchFiltered;

  return (
    <>
      <HeroSection onSearch={setSearchQuery} />
      <main className="max-w-7xl mx-auto px-4 pb-16">
        <FilterSortBar images={images} onFiltered={setFilteredImages} />
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground font-body text-sm">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading images…
              </span>
            ) : (
              <span>
                <strong className="text-foreground">{filtered.length}</strong>{" "}
                images
                {searchQuery && ` for "${searchQuery}"`}
              </span>
            )}
          </p>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Grid3X3 className="w-4 h-4" />
            <Layers className="w-4 h-4" />
          </div>
        </div>

        {loading ? (
          <div
            data-ocid="gallery.loading_state"
            className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                key={i}
                className="w-full rounded-lg bg-muted/30 animate-pulse"
                style={{
                  height: `${[200, 280, 180, 250, 220, 300, 170, 240][i]}px`,
                }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div data-ocid="gallery.empty_state" className="text-center py-24">
            <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="font-display text-lg text-muted-foreground">
              No images found
            </p>
            <p className="text-muted-foreground/60 text-sm font-body mt-1">
              Try a different search term
            </p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
            {filtered.map((img, i) => (
              <ImageCard
                key={String(img.id)}
                image={img}
                index={i}
                onOpen={onImageOpen}
                onUserClick={onUserClick}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// CategoryChips
// ──────────────────────────────────────────────────────────────────────────────
function CategoryChips({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (cat: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_CATEGORIES.map((cat) => {
        const isSelected = selected.has(cat.toLowerCase());
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onToggle(cat.toLowerCase())}
            className={`px-3 py-1.5 rounded-full text-xs font-body font-medium transition-all border ${
              isSelected
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-muted-foreground border-border/40 hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// UploadPage
// ──────────────────────────────────────────────────────────────────────────────
function UploadPage({
  actor,
  onUploaded,
}: {
  actor: backendInterface | null;
  onUploaded: () => void;
}) {
  const [title, setTitle] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [extraTags, setExtraTags] = useState("");
  const [fileSelected, setFileSelected] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<File | null>(null);

  const aspects = [
    "aspect-[4/5]",
    "aspect-[3/4]",
    "aspect-[1/1]",
    "aspect-[16/9]",
    "aspect-[4/3]",
  ];

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFileSelected(f);
    fileRef.current = f;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) {
      setFileSelected(f);
      fileRef.current = f;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current;
    if (!title.trim() || !file) {
      toast.error("Please fill in the title and select a file.");
      return;
    }
    if (!actor) {
      toast.error("Not connected to backend. Please try again.");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const blob = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) => {
        setUploadProgress(Math.round(pct));
      });
      const chipTags = Array.from(selectedCategories);
      const extraTagList = extraTags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      const tagList = [...new Set([...chipTags, ...extraTagList])];
      const aspectClass = aspects[Math.floor(Math.random() * aspects.length)];
      await actor.uploadImage(title.trim(), tagList, aspectClass, blob);
      toast.success("Image uploaded! Awaiting admin approval.");
      setTitle("");
      setSelectedCategories(new Set());
      setExtraTags("");
      setFileSelected(null);
      fileRef.current = null;
      setUploadProgress(0);
      onUploaded();
    } catch (err) {
      console.error(err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="font-display text-4xl font-bold mb-2">
          Share your work
        </h1>
        <p className="text-muted-foreground font-body mb-10">
          Upload high-quality images for the community to enjoy and download
          freely.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div
            data-ocid="upload.dropzone"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragging
                ? "border-primary bg-primary/5"
                : "border-border/40 hover:border-border"
            }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              data-ocid="upload.upload_button"
            />
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            {fileSelected ? (
              <>
                <p className="font-body font-medium text-foreground">
                  {fileSelected.name}
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  {(fileSelected.size / 1024 / 1024).toFixed(2)} MB · Click to
                  change
                </p>
              </>
            ) : (
              <>
                <p className="font-body font-medium text-foreground">
                  Drop your image here
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  PNG, JPG, WEBP up to 50MB
                </p>
              </>
            )}
          </div>

          {uploading && (
            <div data-ocid="upload.loading_state" className="space-y-2">
              <div className="flex justify-between text-xs font-body text-muted-foreground">
                <span>Uploading…</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title" className="font-body font-medium">
              Title
            </Label>
            <Input
              id="title"
              data-ocid="upload.input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A descriptive title for your image"
              className="bg-card border-border/50 font-body"
            />
          </div>

          <div className="space-y-3">
            <Label className="font-body font-medium">
              Categories
              <span className="text-muted-foreground font-normal ml-1">
                (click to select)
              </span>
            </Label>
            <CategoryChips
              selected={selectedCategories}
              onToggle={toggleCategory}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="extra-tags" className="font-body font-medium">
              Additional Tags
              <span className="text-muted-foreground font-normal ml-1">
                (optional, comma separated)
              </span>
            </Label>
            <Textarea
              id="extra-tags"
              data-ocid="upload.textarea"
              value={extraTags}
              onChange={(e) => setExtraTags(e.target.value)}
              placeholder="sunset, golden hour, landscape…"
              rows={2}
              className="bg-card border-border/50 font-body resize-none"
            />
          </div>

          <Button
            type="submit"
            data-ocid="upload.submit_button"
            disabled={uploading}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-body text-base"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Upload className="w-4 h-4" /> Upload Image
              </span>
            )}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground font-body text-center mt-6">
          All uploads are reviewed by our admin before being published. By
          uploading you agree to our content guidelines.
        </p>
      </motion.div>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// PublicProfilePage
// ──────────────────────────────────────────────────────────────────────────────
function PublicProfilePage({
  actor,
  principalStr,
  onImageOpen,
  onBack,
}: {
  actor: backendInterface | null;
  principalStr: string;
  onImageOpen: (img: BackendImage) => void;
  onBack: () => void;
}) {
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [userImages, setUserImages] = useState<BackendImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actor) return;
    setLoading(true);
    // Import Principal dynamically from the backend
    import("@icp-sdk/core/principal")
      .then(({ Principal }) => {
        const principal = Principal.fromText(principalStr);
        return Promise.all([
          actor.getPublicUserProfile(principal),
          actor.getUserImages(principal),
        ]);
      })
      .then(([p, imgs]) => {
        setProfile(p ?? null);
        setUserImages(imgs);
      })
      .catch(() => toast.error("Failed to load profile."))
      .finally(() => setLoading(false));
  }, [actor, principalStr]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <button
          type="button"
          onClick={onBack}
          data-ocid="public-profile.button"
          className="text-muted-foreground hover:text-foreground font-body text-sm mb-8 flex items-center gap-1.5 transition-colors"
        >
          ← Back
        </button>

        {loading ? (
          <div
            data-ocid="public-profile.loading_state"
            className="flex justify-center py-24"
          >
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex items-start gap-6 mb-12">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-display font-bold text-primary-foreground flex-shrink-0">
                {(profile?.username ?? principalStr).slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1">
                <h1 className="font-display text-3xl font-bold mb-1">
                  {profile?.username ?? "Unknown User"}
                </h1>
                {profile?.bio && (
                  <p className="text-muted-foreground font-body text-sm mb-3">
                    {profile.bio}
                  </p>
                )}
                <div className="flex gap-6 text-sm font-body">
                  <span className="text-foreground">
                    <strong>{String(profile?.uploadCount ?? 0)}</strong>{" "}
                    <span className="text-muted-foreground">uploads</span>
                  </span>
                  <span className="text-foreground">
                    <strong>{String(profile?.totalLikesReceived ?? 0)}</strong>{" "}
                    <span className="text-muted-foreground">
                      likes received
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <h2 className="font-display text-xl font-bold mb-4">
              Photos by {profile?.username ?? "this user"}
            </h2>

            {userImages.length === 0 ? (
              <div
                data-ocid="public-profile.empty_state"
                className="border border-dashed border-border/40 rounded-xl p-10 text-center"
              >
                <p className="text-muted-foreground font-body">
                  No published photos yet.
                </p>
              </div>
            ) : (
              <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
                {userImages.map((img, i) => (
                  <ImageCard
                    key={String(img.id)}
                    image={img}
                    index={i}
                    onOpen={onImageOpen}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ProfilePage (own profile with tabs)
// ──────────────────────────────────────────────────────────────────────────────
function ProfilePage({
  actor,
  principal,
  onImageOpen,
}: {
  actor: backendInterface | null;
  principal: string;
  onImageOpen: (img: BackendImage) => void;
}) {
  const [profile, setProfile] = useState<BackendUser | null>(null);
  const [publicStats, setPublicStats] = useState<PublicUserProfile | null>(
    null,
  );
  const [userImages, setUserImages] = useState<BackendImage[]>([]);
  const [filteredUserImages, setFilteredUserImages] = useState<BackendImage[]>(
    [],
  );
  const [favoriteImages, setFavoriteImages] = useState<BackendImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);

  const shortPrincipal = `${principal.slice(0, 8)}…${principal.slice(-5)}`;

  const loadData = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const p = Principal.fromText(principal);
      const [callerProfile, stats, imgs, favoriteIds] = await Promise.all([
        actor.getCallerProfile().catch(() => null),
        actor.getPublicUserProfile(p).catch(() => null),
        actor.getUserImages(p).catch(() => []),
        actor.getFavorites().catch(() => []),
      ]);
      setProfile(callerProfile);
      setPublicStats(stats);
      setUserImages(imgs);
      setEditUsername(callerProfile?.username ?? "");
      setEditBio(callerProfile?.bio ?? "");

      // Fetch favorite images
      if (favoriteIds.length > 0) {
        const favImgs = await Promise.all(
          favoriteIds.map((id) => actor.getImage(id).catch(() => null)),
        );
        setFavoriteImages(
          favImgs.filter((img): img is BackendImage => img !== null),
        );
      }
    } catch {
      toast.error("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [actor, principal]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!actor) return;
    setSaving(true);
    try {
      await actor.updateProfile(editUsername.trim(), editBio.trim());
      setProfile((prev) =>
        prev
          ? { ...prev, username: editUsername.trim(), bio: editBio.trim() }
          : prev,
      );
      setEditing(false);
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-16">
        <div
          data-ocid="profile.loading_state"
          className="flex justify-center py-24"
        >
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Profile header */}
        <div className="flex items-start gap-6 mb-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-display font-bold text-primary-foreground flex-shrink-0">
            {(profile?.username ?? principal).slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="space-y-3">
                <Input
                  data-ocid="profile.input"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Username"
                  className="bg-card border-border/50 font-body"
                />
                <Textarea
                  data-ocid="profile.textarea"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Bio"
                  rows={2}
                  className="bg-card border-border/50 font-body resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    data-ocid="profile.save_button"
                    onClick={handleSave}
                    disabled={saving}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-body"
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                  <Button
                    data-ocid="profile.cancel_button"
                    onClick={() => setEditing(false)}
                    size="sm"
                    variant="outline"
                    className="border-border/50 font-body"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="font-display text-3xl font-bold mb-1">
                  {profile?.username ?? "Anonymous"}
                </h1>
                {profile?.bio && (
                  <p className="text-muted-foreground font-body text-sm mb-2">
                    {profile.bio}
                  </p>
                )}
                <p className="text-muted-foreground font-body font-mono text-sm">
                  {shortPrincipal}
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <Badge className="font-body text-xs" variant="secondary">
                    {profile?.role ?? "guest"}
                  </Badge>
                  <span className="text-sm font-body">
                    <strong>{String(publicStats?.uploadCount ?? 0)}</strong>{" "}
                    <span className="text-muted-foreground">uploads</span>
                  </span>
                  <span className="text-sm font-body">
                    <strong>
                      {String(publicStats?.totalLikesReceived ?? 0)}
                    </strong>{" "}
                    <span className="text-muted-foreground">
                      likes received
                    </span>
                  </span>
                  <Button
                    data-ocid="profile.edit_button"
                    onClick={() => setEditing(true)}
                    size="sm"
                    variant="outline"
                    className="border-border/50 font-body text-xs"
                  >
                    Edit Profile
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="photos">
          <TabsList className="mb-6 bg-secondary/40">
            <TabsTrigger
              value="photos"
              data-ocid="profile.tab"
              className="font-body text-sm"
            >
              My Photos ({userImages.length})
            </TabsTrigger>
            <TabsTrigger
              value="favorites"
              data-ocid="profile.tab"
              className="font-body text-sm"
            >
              Favorites ({favoriteImages.length})
            </TabsTrigger>
            <TabsTrigger
              value="albums"
              data-ocid="profile.tab"
              className="font-body text-sm"
            >
              Albums
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photos">
            {userImages.length > 0 && (
              <FilterSortBar
                images={userImages}
                onFiltered={setFilteredUserImages}
              />
            )}
            {filteredUserImages.length === 0 ? (
              <div
                data-ocid="profile.empty_state"
                className="border border-dashed border-border/40 rounded-xl p-10 text-center"
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="font-body text-muted-foreground">
                  {userImages.length === 0
                    ? "You haven't uploaded any photos yet."
                    : "No photos match the filter."}
                </p>
              </div>
            ) : (
              <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
                {filteredUserImages.map((img, i) => (
                  <ImageCard
                    key={String(img.id)}
                    image={img}
                    index={i}
                    onOpen={onImageOpen}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites">
            {favoriteImages.length === 0 ? (
              <div
                data-ocid="profile.favorites.empty_state"
                className="border border-dashed border-border/40 rounded-xl p-10 text-center"
              >
                <Bookmark className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="font-body text-muted-foreground">
                  No favorites saved yet.
                </p>
              </div>
            ) : (
              <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
                {favoriteImages.map((img, i) => (
                  <ImageCard
                    key={String(img.id)}
                    image={img}
                    index={i}
                    onOpen={onImageOpen}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="albums">
            <AlbumsTabContent
              actor={actor}
              principal={principal}
              onImageOpen={onImageOpen}
            />
          </TabsContent>
        </Tabs>
      </motion.div>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// AdminPage
// ──────────────────────────────────────────────────────────────────────────────
function AdminPage({ actor }: { actor: backendInterface | null }) {
  const [pending, setPending] = useState<BackendImage[]>([]);
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"moderation" | "users">(
    "moderation",
  );

  const loadData = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const [p, u] = await Promise.all([
        actor.getPendingReview(),
        actor.getAllUsers(),
      ]);
      setPending(p);
      setUsers(u);
    } catch {
      toast.error("Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (img: BackendImage) => {
    if (!actor) return;
    try {
      await actor.approveImage(img.id);
      setPending((prev) => prev.filter((i) => i.id !== img.id));
      toast.success(`"${img.title}" approved!`);
    } catch {
      toast.error("Failed to approve image.");
    }
  };

  const handleReject = async (img: BackendImage) => {
    if (!actor) return;
    try {
      await actor.rejectImage(img.id);
      setPending((prev) => prev.filter((i) => i.id !== img.id));
      toast.success("Image rejected.");
    } catch {
      toast.error("Failed to reject image.");
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground font-body text-sm">
              Moderate content and manage the platform
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-8">
          <button
            type="button"
            data-ocid="admin.tab"
            onClick={() => setActiveTab("moderation")}
            className={`px-4 py-2 rounded-lg font-body text-sm font-medium transition-colors ${
              activeTab === "moderation"
                ? "bg-primary text-primary-foreground"
                : "bg-card hover:bg-secondary border border-border/40"
            }`}
          >
            Moderation {pending.length > 0 && `(${pending.length})`}
          </button>
          <button
            type="button"
            data-ocid="admin.tab"
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-lg font-body text-sm font-medium transition-colors ${
              activeTab === "users"
                ? "bg-primary text-primary-foreground"
                : "bg-card hover:bg-secondary border border-border/40"
            }`}
          >
            Users ({users.length})
          </button>
        </div>

        {loading ? (
          <div
            data-ocid="admin.loading_state"
            className="flex justify-center py-24"
          >
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === "moderation" ? (
          <div>
            {pending.length === 0 ? (
              <div
                data-ocid="admin.empty_state"
                className="border border-dashed border-border/40 rounded-xl p-10 text-center"
              >
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-60" />
                <p className="font-body text-muted-foreground">
                  All caught up!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((img, i) => {
                  const imgUrl = img.blob.getDirectURL();
                  const gradient = getGradientForId(img.id);
                  return (
                    <div
                      key={String(img.id)}
                      data-ocid={`admin.item.${i + 1}`}
                      className="flex items-center gap-4 bg-card rounded-xl p-4 border border-border/30"
                    >
                      <div
                        className={`w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden ${
                          !imgUrl ? `bg-gradient-to-br ${gradient}` : ""
                        }`}
                      >
                        {imgUrl && (
                          <img
                            src={imgUrl}
                            alt={img.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body font-medium text-foreground text-sm line-clamp-1">
                          {img.title}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {img.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs font-body text-muted-foreground border border-border/30 rounded-full px-2 py-0.5"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          data-ocid="admin.confirm_button"
                          onClick={() => handleApprove(img)}
                          className="bg-green-800 hover:bg-green-700 text-green-100 font-body text-xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          data-ocid="admin.delete_button"
                          onClick={() => handleReject(img)}
                          className="font-body text-xs"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {users.length === 0 ? (
              <div
                data-ocid="admin.users.empty_state"
                className="border border-dashed border-border/40 rounded-xl p-10 text-center"
              >
                <User className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="font-body text-muted-foreground">No users yet</p>
              </div>
            ) : (
              users.map((u, i) => (
                <div
                  key={u.id.toString()}
                  data-ocid={`admin.item.${i + 1}`}
                  className="flex items-center gap-4 bg-card rounded-xl p-4 border border-border/30"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm font-display">
                      {u.username.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-medium text-foreground text-sm">
                      {u.username}
                    </p>
                    <p className="text-muted-foreground text-xs font-mono mt-0.5 truncate">
                      {u.id.toString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="font-body text-xs">
                    {u.role}
                  </Badge>
                </div>
              ))
            )}
          </div>
        )}
      </motion.div>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Navbar
// ──────────────────────────────────────────────────────────────────────────────
function Navbar({
  currentPage,
  onNavigate,
  identity,
  isAdmin,
  onLogin,
  onLogout,
  isLoggingIn,
}: {
  currentPage: Page;
  onNavigate: (p: Page) => void;
  identity: ReturnType<typeof useInternetIdentity>["identity"];
  isAdmin: boolean;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <button
          type="button"
          data-ocid="nav.link"
          onClick={() => onNavigate("gallery")}
          className="flex items-center gap-2 font-display font-bold text-lg text-foreground hover:text-primary transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Camera className="w-4 h-4 text-primary-foreground" />
          </div>
          ImageShare
        </button>

        <nav className="hidden md:flex items-center gap-1">
          <button
            type="button"
            data-ocid="nav.link"
            onClick={() => onNavigate("gallery")}
            className={`px-3 py-1.5 rounded-lg text-sm font-body transition-colors ${
              currentPage === "gallery"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <span className="flex items-center gap-1">
              <Grid3X3 className="w-3.5 h-3.5" /> Gallery
            </span>
          </button>
          {identity && (
            <button
              type="button"
              data-ocid="nav.link"
              onClick={() => onNavigate("upload")}
              className={`px-3 py-1.5 rounded-lg text-sm font-body transition-colors ${
                currentPage === "upload"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <span className="flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" /> Upload
              </span>
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              data-ocid="nav.link"
              onClick={() => onNavigate("admin")}
              className={`px-3 py-1.5 rounded-lg text-sm font-body transition-colors ${
                currentPage === "admin"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Admin
              </span>
            </button>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {identity ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-ocid="nav.dropdown_menu"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-display">
                      {identity
                        .getPrincipal()
                        .toString()
                        .slice(0, 1)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-popover border-border/50 font-body"
              >
                <DropdownMenuItem
                  data-ocid="nav.profile.link"
                  onClick={() => onNavigate("profile")}
                  className="cursor-pointer"
                >
                  <User className="w-4 h-4 mr-2" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="md:hidden cursor-pointer"
                  onClick={() => onNavigate("upload")}
                >
                  <Upload className="w-4 h-4 mr-2" /> Upload
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem
                    className="md:hidden cursor-pointer"
                    onClick={() => onNavigate("admin")}
                  >
                    <Shield className="w-4 h-4 mr-2" /> Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-border/40" />
                <DropdownMenuItem
                  data-ocid="nav.button"
                  onClick={onLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              data-ocid="nav.primary_button"
              onClick={onLogin}
              disabled={isLoggingIn}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-body"
            >
              {isLoggingIn ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Sign In
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Footer
// ──────────────────────────────────────────────────────────────────────────────
function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border/30 py-8 mt-8">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-display font-bold text-foreground">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Camera className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          ImageShare
        </div>
        <p className="text-muted-foreground text-xs font-body">
          © {year}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Built with love using caffeine.ai
          </a>
        </p>
      </div>
    </footer>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// RegistrationDialog
// ──────────────────────────────────────────────────────────────────────────────
function RegistrationDialog({
  open,
  actor,
  onRegistered,
}: {
  open: boolean;
  actor: backendInterface | null;
  onRegistered: () => void;
}) {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Please enter a username.");
      return;
    }
    if (!actor) return;
    setSubmitting(true);
    try {
      await actor.registerUser(username.trim(), bio.trim());
      toast.success("Welcome to ImageShare!");
      onRegistered();
    } catch {
      toast.error("Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        data-ocid="register.dialog"
        className="bg-card border-border/50"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Welcome to ImageShare
          </DialogTitle>
          <DialogDescription className="font-body text-muted-foreground">
            Set up your profile to start sharing and exploring.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleRegister} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="reg-username" className="font-body font-medium">
              Username
            </Label>
            <Input
              id="reg-username"
              data-ocid="register.input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              className="bg-background border-border/50 font-body"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-bio" className="font-body font-medium">
              Bio{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="reg-bio"
              data-ocid="register.textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us a bit about yourself"
              rows={2}
              className="bg-background border-border/50 font-body resize-none"
            />
          </div>
          <Button
            type="submit"
            data-ocid="register.submit_button"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-body"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Creating account…
              </span>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// App
// ──────────────────────────────────────────────────────────────────────────────
export default function App() {
  const { login, clear, loginStatus, identity, isInitializing } =
    useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const isLoggingIn = loginStatus === "logging-in";

  const [page, setPage] = useState<Page>("gallery");
  const [images, setImages] = useState<BackendImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<BackendImage | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [viewingPrincipal, setViewingPrincipal] = useState<string | null>(null);

  // Like & favorite state
  const [likedImages, setLikedImages] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const loadGallery = useCallback(
    async (actorInstance?: backendInterface | null) => {
      const a = actorInstance ?? actor;
      if (!a) return;
      setGalleryLoading(true);
      try {
        const imgs = await a.getPublicGallery();
        setImages(imgs);
      } catch {
        toast.error("Failed to load gallery.");
      } finally {
        setGalleryLoading(false);
      }
    },
    [actor],
  );

  const loadUserInteractions = useCallback(async (a: backendInterface) => {
    try {
      const [liked, favs] = await Promise.all([
        a.getUserLikedImages().catch(() => []),
        a.getFavorites().catch(() => []),
      ]);
      setLikedImages(new Set(liked.map((id) => String(id))));
      setFavorites(new Set(favs.map((id) => String(id))));
    } catch {}
  }, []);

  // Load gallery when actor becomes available
  useEffect(() => {
    if (actor && !actorFetching) {
      loadGallery(actor);
    }
  }, [actor, actorFetching, loadGallery]);

  // Check auth when actor + identity changes
  useEffect(() => {
    if (isInitializing || actorFetching || !actor) return;

    if (!identity) {
      setIsAdmin(false);
      setNeedsRegistration(false);
      setAuthChecked(true);
      setLikedImages(new Set());
      setFavorites(new Set());
      return;
    }

    const checkAuth = async () => {
      try {
        const [adminStatus, profile] = await Promise.all([
          actor.isCallerAdmin(),
          actor.getCallerProfile().catch(() => null),
        ]);
        setIsAdmin(adminStatus);
        setNeedsRegistration(!profile);
        if (profile) {
          loadUserInteractions(actor);
        }
      } catch {
        setNeedsRegistration(true);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [identity, isInitializing, actor, actorFetching, loadUserInteractions]);

  const handleLogin = () => login();

  const handleLogout = () => {
    clear();
    setIsAdmin(false);
    setNeedsRegistration(false);
    setLikedImages(new Set());
    setFavorites(new Set());
    setPage("gallery");
  };

  const handleRegistered = async () => {
    setNeedsRegistration(false);
    if (actor) {
      try {
        const adminStatus = await actor.isCallerAdmin();
        setIsAdmin(adminStatus);
        loadUserInteractions(actor);
      } catch {}
    }
  };

  const navigate = (p: Page) => {
    setPage(p);
    if (p !== "public-profile") setViewingPrincipal(null);
  };

  const handleImageOpen = (img: BackendImage) => {
    setSelectedImage(img);
    if (actor) actor.incrementViews(img.id).catch(() => {});
  };

  const handleDownload = async (id: bigint) => {
    if (actor) {
      try {
        await actor.incrementDownloads(id);
        setImages((prev) =>
          prev.map((img) =>
            img.id === id
              ? { ...img, downloads: img.downloads + BigInt(1) }
              : img,
          ),
        );
        if (selectedImage?.id === id) {
          setSelectedImage((prev) =>
            prev ? { ...prev, downloads: prev.downloads + BigInt(1) } : prev,
          );
        }
      } catch {}
    }
    const img = images.find((i) => i.id === id);
    if (img) {
      const url = img.blob.getDirectURL();
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = img.title;
        a.click();
      }
    }
  };

  const handleToggleLike = async (id: bigint, currentlyLiked: boolean) => {
    if (!actor || !identity) return;
    const idStr = String(id);
    // Optimistic update
    setLikedImages((prev) => {
      const next = new Set(prev);
      if (currentlyLiked) next.delete(idStr);
      else next.add(idStr);
      return next;
    });
    setImages((prev) =>
      prev.map((img) =>
        img.id === id
          ? {
              ...img,
              likes: currentlyLiked
                ? img.likes - BigInt(1)
                : img.likes + BigInt(1),
            }
          : img,
      ),
    );
    if (selectedImage?.id === id) {
      setSelectedImage((prev) =>
        prev
          ? {
              ...prev,
              likes: currentlyLiked
                ? prev.likes - BigInt(1)
                : prev.likes + BigInt(1),
            }
          : prev,
      );
    }
    try {
      if (currentlyLiked) {
        await actor.unlikeImage(id);
      } else {
        await actor.likeImage(id);
      }
    } catch {
      // Rollback
      setLikedImages((prev) => {
        const next = new Set(prev);
        if (currentlyLiked) next.add(idStr);
        else next.delete(idStr);
        return next;
      });
      setImages((prev) =>
        prev.map((img) =>
          img.id === id
            ? {
                ...img,
                likes: currentlyLiked
                  ? img.likes + BigInt(1)
                  : img.likes - BigInt(1),
              }
            : img,
        ),
      );
      toast.error("Failed to update like.");
    }
  };

  const handleToggleFavorite = async (
    id: bigint,
    currentlyFavorited: boolean,
  ) => {
    if (!actor || !identity) return;
    const idStr = String(id);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (currentlyFavorited) next.delete(idStr);
      else next.add(idStr);
      return next;
    });
    try {
      if (currentlyFavorited) {
        await actor.removeFavorite(id);
        toast.success("Removed from favorites.");
      } else {
        await actor.addFavorite(id);
        toast.success("Added to favorites!");
      }
    } catch {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (currentlyFavorited) next.add(idStr);
        else next.delete(idStr);
        return next;
      });
      toast.error("Failed to update favorites.");
    }
  };

  const handleViewUserProfile = (ownerPrincipal: string) => {
    setViewingPrincipal(ownerPrincipal);
    setPage("public-profile");
  };

  if (isInitializing || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Toaster position="top-right" />

      <RegistrationDialog
        open={!!identity && needsRegistration}
        actor={actor}
        onRegistered={handleRegistered}
      />

      <Navbar
        currentPage={page}
        onNavigate={navigate}
        identity={identity}
        isAdmin={isAdmin}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
      />

      <div className="flex-1">
        <AnimatePresence mode="wait">
          {page === "gallery" && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <GalleryPage
                images={images}
                loading={galleryLoading}
                onImageOpen={handleImageOpen}
                onUserClick={handleViewUserProfile}
              />
            </motion.div>
          )}
          {page === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <UploadPage
                actor={actor}
                onUploaded={() => {
                  setPage("gallery");
                  if (actor) loadGallery(actor);
                }}
              />
            </motion.div>
          )}
          {page === "profile" && identity && (
            <motion.div
              key="profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ProfilePage
                actor={actor}
                principal={identity.getPrincipal().toString()}
                onImageOpen={handleImageOpen}
              />
            </motion.div>
          )}
          {page === "admin" && isAdmin && (
            <motion.div
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <AdminPage actor={actor} />
            </motion.div>
          )}
          {page === "public-profile" && viewingPrincipal && (
            <motion.div
              key="public-profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <PublicProfilePage
                actor={actor}
                principalStr={viewingPrincipal}
                onImageOpen={handleImageOpen}
                onBack={() => setPage("gallery")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ImageDetailDialog
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
        onDownload={handleDownload}
        actor={actor}
        isLoggedIn={!!identity && !needsRegistration}
        likedImages={likedImages}
        favorites={favorites}
        onToggleLike={handleToggleLike}
        onToggleFavorite={handleToggleFavorite}
        onLoginRequest={handleLogin}
        onUserClick={handleViewUserProfile}
        userPrincipal={
          identity ? identity.getPrincipal().toString() : undefined
        }
      />

      <Footer />
    </div>
  );
}

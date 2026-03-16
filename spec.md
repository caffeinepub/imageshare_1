# ImageShare

## Current State
ImageShare is a decentralized image-sharing app with:
- Public gallery with approved images, search, and category filters
- Image upload with category chips and optional tags
- Like (public counter) and Favorite (private collection) per image
- Comments (instant, guests can read, only logged-in users can post)
- Download counter per image
- Public user profiles (bio, upload count, total likes received)
- Admin panel for approving/rejecting uploaded images
- Persistent blob storage for images in canister

## Requested Changes (Diff)

### Add
- **Image detail page**: Full-size view modal/page with metadata (uploader, date, category, tags, likes, downloads) and download button (full size + thumbnail size option)
- **Filter & sorting panel**: Combined filter bar in gallery and user profile pages -- filter by category, sort by newest/most liked/most downloaded
- **Album/Collection feature**:
  - Users can create named albums and add images to albums
  - Albums can be set as public (visible to all) or private (protected by password)
  - One image can belong to multiple albums
  - Backend stores albums with owner, name, description, isPublic, passwordHash, imageIds[]
  - Backend API: createAlbum, updateAlbum, deleteAlbum, addImageToAlbum, removeImageFromAlbum, getAlbum (password-gated), getUserAlbums, getPublicAlbums

### Modify
- Gallery page: add filter/sort bar above the image grid
- User profile page: add filter/sort bar + Albums tab alongside existing tabs
- Image card: clicking opens image detail view instead of direct download

### Remove
- Nothing removed

## Implementation Plan
1. Add Album type and album CRUD methods to Motoko backend
2. Add getPublicAlbums and getAlbumImages with optional password check
3. Frontend: Image detail modal with metadata, full-size view, and download size choices
4. Frontend: Filter & sort bar component reused in gallery and profile
5. Frontend: Album management UI (create, edit, delete albums, add/remove images)
6. Frontend: Public album browsing with password prompt for private albums

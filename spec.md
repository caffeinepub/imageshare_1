# ImageShare

## Current State
- Public gallery with approved images (sample + uploaded)
- User registration and profile (username, bio)
- Image upload with title, tags (free text), aspect class
- Like system (per-image counter, per-user liked list)
- Download counter and view counter
- Admin panel: approve/reject images, manage users, change roles
- Backend persistence in Motoko canister
- Authorization via AccessControl (admin/user/guest)
- Blob storage for images

## Requested Changes (Diff)

### Add
- **Favorites** (separate from Like): users can save images to a personal favorites collection; favorites stored per user in backend
- **Comments**: per-image comment thread; comments are public (no auth to read), only logged-in users can post; no moderation; stored in backend with author principal, username, text, and timestamp
- **Preset categories for upload**: predefined clickable tags (Nature, Anime, Architecture, Travel, Food, Abstract, Animals, Technology, People, Street, Sports, Fashion) that auto-populate the tags field; additional free-text tags optional
- **Public user profile page**: shows username, bio, total upload count, total likes received, and the user's uploaded images (approved only)
- **getUserPublicProfile endpoint**: returns public profile data including stats for any user principal
- **getUserImages endpoint**: returns approved images by a specific user
- **getFavorites endpoint**: returns favorite image IDs for the current user
- **addFavorite / removeFavorite endpoints**
- **addComment / getComments endpoints**
- **getUserLikedImages endpoint**: returns liked image IDs for the current user (to know if already liked)
- **unlikeImage endpoint**: allow users to unlike a previously liked image

### Modify
- Image type: no changes needed to existing fields
- User type: no changes needed (bio already exists)
- Upload flow: replace free-text tag entry with preset category chips + optional additional tags input

### Remove
- Nothing removed

## Implementation Plan
1. Add `Comment` type with fields: id, imageId, author (Principal), authorUsername, text, createdAt (Int)
2. Add `comments` map and `nextCommentId` counter to backend state
3. Add `userFavorites` map (Principal -> [Nat]) to backend state
4. Add `addComment(imageId, text)` - requires login; auto-fetches username
5. Add `getComments(imageId)` - public query
6. Add `addFavorite(imageId)` and `removeFavorite(imageId)` - requires login
7. Add `getFavorites()` - returns current user's favorite image IDs
8. Add `getUserLikedImages()` - returns current user's liked image IDs
9. Add `unlikeImage(imageId)` - remove from userLikes and decrement counter
10. Add `PublicUserProfile` type with username, bio, uploadCount, totalLikesReceived
11. Add `getPublicUserProfile(user: Principal)` - public query returning stats
12. Add `getUserImages(user: Principal)` - public query returning approved images by user
13. Frontend: Add preset category chips in upload form
14. Frontend: Add Like button (toggle) and Favorite button (toggle) on image cards and image detail
15. Frontend: Add comment section on image detail page (view always, post only when logged in)
16. Frontend: Add public profile page at /profile/:principalId showing bio, stats, images
17. Frontend: Update My Profile page to show total likes received and favorites collection

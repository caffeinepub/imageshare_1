import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface PublicUserProfile {
    bio: string;
    username: string;
    uploadCount: bigint;
    totalLikesReceived: bigint;
}
export interface Comment {
    id: bigint;
    authorUsername: string;
    createdAt: bigint;
    text: string;
    author: Principal;
    imageId: bigint;
}
export interface User {
    id: Principal;
    bio: string;
    username: string;
    role: UserRole;
}
export interface Image {
    id: bigint;
    title: string;
    pending: boolean;
    views: bigint;
    owner: Principal;
    blob: ExternalBlob;
    tags: Array<string>;
    aspectClass: string;
    likes: bigint;
    approved: boolean;
    downloads: bigint;
}
export interface UserProfile {
    bio: string;
    username: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addComment(imageId: bigint, text: string): Promise<void>;
    addFavorite(imageId: bigint): Promise<void>;
    approveImage(imageId: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    changeRole(userId: Principal, newRole: UserRole): Promise<void>;
    deleteImage(imageId: bigint): Promise<void>;
    getAllUsers(): Promise<Array<User>>;
    getCallerProfile(): Promise<User>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getComments(imageId: bigint): Promise<Array<Comment>>;
    getFavorites(): Promise<Array<bigint>>;
    getImage(imageId: bigint): Promise<Image>;
    getPendingReview(): Promise<Array<Image>>;
    getPublicGallery(): Promise<Array<Image>>;
    getPublicUserProfile(user: Principal): Promise<PublicUserProfile | null>;
    getUserImages(user: Principal): Promise<Array<Image>>;
    getUserLikedImages(): Promise<Array<bigint>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    incrementDownloads(imageId: bigint): Promise<void>;
    incrementViews(imageId: bigint): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    likeImage(imageId: bigint): Promise<void>;
    registerUser(username: string, bio: string): Promise<void>;
    rejectImage(imageId: bigint): Promise<void>;
    removeFavorite(imageId: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    unlikeImage(imageId: bigint): Promise<void>;
    updateProfile(username: string, bio: string): Promise<void>;
    uploadImage(title: string, tags: Array<string>, aspectClass: string, blobId: ExternalBlob): Promise<void>;
}

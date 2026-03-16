import Map "mo:core/Map";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";

import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Migration "migration";

(with migration = Migration.run)
actor {
  let accessControlState = AccessControl.initState();
  include MixinStorage();
  include MixinAuthorization(accessControlState);

  public type UserRole = AccessControl.UserRole;

  public type Image = {
    id : Nat;
    owner : Principal;
    title : Text;
    tags : [Text];
    aspectClass : Text;
    blob : Storage.ExternalBlob;
    likes : Nat;
    views : Nat;
    downloads : Nat;
    approved : Bool;
    pending : Bool;
  };

  public type User = {
    id : Principal;
    username : Text;
    bio : Text;
    role : UserRole;
  };

  public type UserProfile = {
    username : Text;
    bio : Text;
  };

  public type Comment = {
    id : Nat;
    imageId : Nat;
    author : Principal;
    authorUsername : Text;
    text : Text;
    createdAt : Int;
  };

  public type PublicUserProfile = {
    username : Text;
    bio : Text;
    uploadCount : Nat;
    totalLikesReceived : Nat;
  };

  let images = Map.empty<Nat, Image>();
  var nextImageId = 0;

  let users = Map.empty<Principal, User>();
  let userLikes = Map.empty<Principal, [Nat]>();
  let userFavorites = Map.empty<Principal, [Nat]>();
  let comments = Map.empty<Nat, Comment>();
  var nextCommentId = 0;

  func getUserInternal(caller : Principal) : User {
    switch (users.get(caller)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?user) { user };
    };
  };

  func arrayContains(array : [Nat], element : Nat) : Bool {
    for (item in array.values()) {
      if (item == element) {
        return true;
      };
    };
    false;
  };

  public shared ({ caller }) func registerUser(username : Text, bio : Text) : async () {
    if (users.get(caller) != null) {
      Runtime.trap("User already exists");
    };

    let role = if (users.isEmpty()) { #admin } else {
      #user;
    };

    let user : User = {
      id = caller;
      username;
      bio;
      role;
    };

    users.add(caller, user);
  };

  public shared ({ caller }) func updateProfile(username : Text, bio : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update profile");
    };

    switch (users.get(caller)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?existingUser) {
        let user : User = {
          id = caller;
          username;
          bio;
          role = existingUser.role;
        };
        users.add(caller, user);
      };
    };
  };

  public query ({ caller }) func getCallerProfile() : async User {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get profile");
    };
    getUserInternal(caller);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get profile");
    };
    switch (users.get(caller)) {
      case (null) { null };
      case (?user) {
        ?{
          username = user.username;
          bio = user.bio;
        };
      };
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profile");
    };
    switch (users.get(caller)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?existingUser) {
        let user : User = {
          id = caller;
          username = profile.username;
          bio = profile.bio;
          role = existingUser.role;
        };
        users.add(caller, user);
      };
    };
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    switch (users.get(user)) {
      case (null) { null };
      case (?u) {
        ?{
          username = u.username;
          bio = u.bio;
        };
      };
    };
  };

  public shared ({ caller }) func changeRole(userId : Principal, newRole : UserRole) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can change roles");
    };

    switch (users.get(userId)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?existingUser) {
        let user : User = {
          id = userId;
          username = existingUser.username;
          bio = existingUser.bio;
          role = newRole;
        };
        users.add(userId, user);
      };
    };
  };

  public query ({ caller }) func getAllUsers() : async [User] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can list all users");
    };
    users.values().toArray();
  };

  public shared ({ caller }) func uploadImage(
    title : Text,
    tags : [Text],
    aspectClass : Text,
    blobId : Storage.ExternalBlob,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upload images");
    };

    switch (users.get(caller)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?_) {};
    };

    let image : Image = {
      id = nextImageId;
      owner = caller;
      title;
      tags;
      aspectClass;
      blob = blobId;
      likes = 0;
      views = 0;
      downloads = 0;
      approved = false;
      pending = true;
    };

    images.add(nextImageId, image);
    nextImageId += 1;
  };

  public shared ({ caller }) func approveImage(imageId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can approve images");
    };

    switch (images.get(imageId)) {
      case (null) { Runtime.trap("Image does not exist") };
      case (?image) {
        let updatedImage : Image = {
          id = image.id;
          owner = image.owner;
          title = image.title;
          tags = image.tags;
          aspectClass = image.aspectClass;
          blob = image.blob;
          likes = image.likes;
          views = image.views;
          downloads = image.downloads;
          approved = true;
          pending = false;
        };
        images.add(imageId, updatedImage);
      };
    };
  };

  public shared ({ caller }) func rejectImage(imageId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can reject images");
    };

    images.remove(imageId);
  };

  public shared ({ caller }) func deleteImage(imageId : Nat) : async () {
    switch (images.get(imageId)) {
      case (null) { Runtime.trap("Image does not exist") };
      case (?image) {
        if (caller != image.owner and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only admin or image owner can delete");
        };
        images.remove(imageId);
      };
    };
  };

  public query ({ caller }) func getImage(imageId : Nat) : async Image {
    switch (images.get(imageId)) {
      case (null) { Runtime.trap("Image does not exist") };
      case (?image) {
        // Only allow viewing approved images publicly, or own images, or admin
        if (not image.approved and caller != image.owner and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Image not approved");
        };
        image;
      };
    };
  };

  public shared ({ caller }) func incrementViews(imageId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can increment views");
    };

    switch (images.get(imageId)) {
      case (null) { Runtime.trap("Image does not exist") };
      case (?image) {
        let updatedImage : Image = {
          id = image.id;
          owner = image.owner;
          title = image.title;
          tags = image.tags;
          aspectClass = image.aspectClass;
          blob = image.blob;
          likes = image.likes;
          views = image.views + 1;
          downloads = image.downloads;
          approved = image.approved;
          pending = image.pending;
        };
        images.add(imageId, updatedImage);
      };
    };
  };

  public shared ({ caller }) func incrementDownloads(imageId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can increment downloads");
    };

    switch (images.get(imageId)) {
      case (null) { Runtime.trap("Image does not exist") };
      case (?image) {
        let updatedImage : Image = {
          id = image.id;
          owner = image.owner;
          title = image.title;
          tags = image.tags;
          aspectClass = image.aspectClass;
          blob = image.blob;
          likes = image.likes;
          views = image.views;
          downloads = image.downloads + 1;
          approved = image.approved;
          pending = image.pending;
        };
        images.add(imageId, updatedImage);
      };
    };
  };

  public shared ({ caller }) func likeImage(imageId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like images");
    };

    switch (images.get(imageId)) {
      case (null) { Runtime.trap("Image does not exist") };
      case (?image) {
        switch (userLikes.get(caller)) {
          case (null) {
            userLikes.add(caller, [imageId]);
            let updatedImage : Image = {
              id = image.id;
              owner = image.owner;
              title = image.title;
              tags = image.tags;
              aspectClass = image.aspectClass;
              blob = image.blob;
              likes = image.likes + 1;
              views = image.views;
              downloads = image.downloads;
              approved = image.approved;
              pending = image.pending;
            };
            images.add(imageId, updatedImage);
          };
          case (?likedImages) {
            if (arrayContains(likedImages, imageId)) {
              Runtime.trap("Already liked this image");
            };
            let mutableLikedImages = List.fromArray<Nat>(likedImages);
            mutableLikedImages.add(imageId);
            userLikes.add(caller, mutableLikedImages.reverse().toArray());
            let updatedImage : Image = {
              id = image.id;
              owner = image.owner;
              title = image.title;
              tags = image.tags;
              aspectClass = image.aspectClass;
              blob = image.blob;
              likes = image.likes + 1;
              views = image.views;
              downloads = image.downloads;
              approved = image.approved;
              pending = image.pending;
            };
            images.add(imageId, updatedImage);
          };
        };
      };
    };
  };

  public shared ({ caller }) func unlikeImage(imageId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unlike images");
    };

    switch (images.get(imageId)) {
      case (null) { Runtime.trap("Image does not exist") };
      case (?image) {
        switch (userLikes.get(caller)) {
          case (null) { Runtime.trap("No liked images to unlike") };
          case (?likedImages) {
            if (not arrayContains(likedImages, imageId)) {
              Runtime.trap("Image not liked");
            };

            let filtered = likedImages.filter(
              func(id) {
                id != imageId;
              }
            );

            userLikes.add(caller, filtered);

            if (image.likes > 0) {
              let updatedImage : Image = {
                id = image.id;
                owner = image.owner;
                title = image.title;
                tags = image.tags;
                aspectClass = image.aspectClass;
                blob = image.blob;
                likes = image.likes - 1;
                views = image.views;
                downloads = image.downloads;
                approved = image.approved;
                pending = image.pending;
              };
              images.add(imageId, updatedImage);
            };
          };
        };
      };
    };
  };

  public query ({ caller }) func getPublicGallery() : async [Image] {
    let publicImages = List.empty<Image>();
    let imagesArray = images.toArray();
    for ((id, image) in imagesArray.values()) {
      if (image.approved) {
        publicImages.add(image);
      };
    };
    publicImages.reverse().toArray();
  };

  public query ({ caller }) func getPendingReview() : async [Image] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view pending images");
    };

    let pendingImages = List.empty<Image>();
    let imagesArray = images.toArray();
    for ((id, image) in imagesArray.values()) {
      if (image.pending) {
        pendingImages.add(image);
      };
    };
    pendingImages.reverse().toArray();
  };

  public shared ({ caller }) func addFavorite(imageId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add favorites");
    };

    switch (images.get(imageId)) {
      case (null) { Runtime.trap("Image does not exist") };
      case (?_) {
        switch (userFavorites.get(caller)) {
          case (null) {
            userFavorites.add(caller, [imageId]);
          };
          case (?favoriteImages) {
            if (arrayContains(favoriteImages, imageId)) {
              Runtime.trap("Already a favorite");
            };
            let mutableFavorites = List.fromArray<Nat>(favoriteImages);
            mutableFavorites.add(imageId);
            userFavorites.add(caller, mutableFavorites.reverse().toArray());
          };
        };
      };
    };
  };

  public shared ({ caller }) func removeFavorite(imageId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove favorites");
    };

    switch (userFavorites.get(caller)) {
      case (null) { Runtime.trap("No favorites to remove") };
      case (?favoriteImages) {
        let filtered = favoriteImages.filter(
          func(id) {
            id != imageId;
          }
        );
        userFavorites.add(caller, filtered);
      };
    };
  };

  public query ({ caller }) func getFavorites() : async [Nat] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get favorites");
    };
    switch (userFavorites.get(caller)) {
      case (null) { [] };
      case (?favorites) { favorites };
    };
  };

  public query ({ caller }) func getUserLikedImages() : async [Nat] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get liked images");
    };
    switch (userLikes.get(caller)) {
      case (null) { [] };
      case (?likedImages) { likedImages };
    };
  };

  public shared ({ caller }) func addComment(imageId : Nat, text : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can comment");
    };

    let user = getUserInternal(caller);

    let comment : Comment = {
      id = nextCommentId;
      imageId;
      author = caller;
      authorUsername = user.username;
      text;
      createdAt = 0;
    };

    comments.add(nextCommentId, comment);
    nextCommentId += 1;
  };

  public query ({ caller }) func getComments(imageId : Nat) : async [Comment] {
    let commentsArray = List.empty<Comment>();
    let mapArray = comments.toArray();
    for ((id, comment) in mapArray.values()) {
      if (comment.imageId == imageId) {
        commentsArray.add(comment);
      };
    };
    commentsArray.reverse().toArray();
  };

  public query ({ caller }) func getUserImages(user : Principal) : async [Image] {
    let userImages = List.empty<Image>();
    let imagesArray = images.toArray();
    for ((id, image) in imagesArray.values()) {
      if (image.owner == user and image.approved) {
        userImages.add(image);
      };
    };
    userImages.reverse().toArray();
  };

  public query ({ caller }) func getPublicUserProfile(user : Principal) : async ?PublicUserProfile {
    switch (users.get(user)) {
      case (null) { null };
      case (?u) {
        var uploadCount = 0;
        var totalLikesReceived = 0;
        let imagesArray = images.toArray();
        for ((id, image) in imagesArray.values()) {
          if (image.owner == user and image.approved) {
            uploadCount += 1;
            totalLikesReceived += image.likes;
          };
        };
        ?{
          username = u.username;
          bio = u.bio;
          uploadCount;
          totalLikesReceived;
        };
      };
    };
  };
};

import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";

module {
  type UserRole = {
    #admin;
    #user;
    #guest;
  };

  type Image = {
    id : Nat;
    owner : Principal.Principal;
    title : Text;
    tags : [Text];
    aspectClass : Text;
    blob : Blob;
    likes : Nat;
    views : Nat;
    downloads : Nat;
    approved : Bool;
    pending : Bool;
  };

  type User = {
    id : Principal.Principal;
    username : Text;
    bio : Text;
    role : UserRole;
  };

  type OldActorState = {
    images : Map.Map<Nat, Image>;
    users : Map.Map<Principal.Principal, User>;
    userLikes : Map.Map<Principal.Principal, [Nat]>;
    nextImageId : Nat;
  };

  public func run(old : OldActorState) : { images : Map.Map<Nat, Image>; users : Map.Map<Principal.Principal, User>; userLikes : Map.Map<Principal.Principal, [Nat]>; userFavorites : Map.Map<Principal.Principal, [Nat]>; comments : Map.Map<Nat, { id : Nat; imageId : Nat; author : Principal.Principal; authorUsername : Text; text : Text; createdAt : Int }>; nextImageId : Nat; nextCommentId : Nat } {
    let userFavorites = Map.empty<Principal.Principal, [Nat]>();
    let comments = Map.empty<Nat, { id : Nat; imageId : Nat; author : Principal.Principal; authorUsername : Text; text : Text; createdAt : Int }>();
    { old with userFavorites; comments; nextCommentId = 0 };
  };
};

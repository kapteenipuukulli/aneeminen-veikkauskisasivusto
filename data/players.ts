export type ContestPlayerSeed = {
  id: string;
  initials: string;
  displayName: string;
  accessToken: string;
  isAdmin: boolean;
  avatarUrl: string;
};

export const contestPlayers: ContestPlayerSeed[] = [
  {
    id: "oj",
    initials: "OJ",
    displayName: "OJ",
    accessToken: "oj_7f4b91b2d8ac4f2ab6e0f6b9c2d5a143",
    isAdmin: false,
    avatarUrl: "/avatars/oj.jpg"
  },
  {
    id: "mm",
    initials: "MM",
    displayName: "MM",
    accessToken: "mm_c2d83f1a9e5b4d85a17f8db4206fbc75",
    isAdmin: false,
    avatarUrl: "/avatars/mm.jpg"
  },
  {
    id: "jp",
    initials: "JP",
    displayName: "JP",
    accessToken: "jp_admin_41a3d5ed9c6e4896a2f3ef83d8a705b4",
    isAdmin: true,
    avatarUrl: "/avatars/jp.jpg"
  },
  {
    id: "ak",
    initials: "AK",
    displayName: "AK",
    accessToken: "ak_91cc5d6fb4b448b9a35319d407347c2e",
    isAdmin: false,
    avatarUrl: "/avatars/ak.jpg"
  },
  {
    id: "tt",
    initials: "TT",
    displayName: "TT",
    accessToken: "tt_e0c9ae64ff1f45768c6d19dfe218b937",
    isAdmin: false,
    avatarUrl: "/avatars/tt.jpg"
  }
];

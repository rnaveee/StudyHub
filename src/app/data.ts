
export type Course = {
  id: string;
  classID: string;
  className: string;
  professor: string;
  school: string;
  finalsDate: string;
};

export type Chatroom = {
  id: string;
  course: Course;
  joinedUsers: number;
  onGoing: boolean;
};

export type Message = {
  id: string;
  user_id: string;
  body: string | null;
  created_at: string;
  profiles?: {
    avatar_url: string | null
  }[] | {
    avatar_url: string | null
  } | null;
}

export type SearchResult = {
  chatroomId: string;
  classId: string;
  className: string;
  professor: string | null;
  school: string;
  joinedUsers: number;
  isJoined: boolean;
};
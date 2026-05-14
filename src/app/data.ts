
export type School = {
  id: string;
  name: string;
  color: string;
};

export type Course = {
  id: string;
  classID: string;
  className: string;
  professor: string;
  school: School;
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
  school: School;
  joinedUsers: number;
  isJoined: boolean;
};
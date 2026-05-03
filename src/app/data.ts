export type StudyUser = {
  id: string;
  username: string;
  email: string;
  major: string;
  color: string;
  school: string;
};

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

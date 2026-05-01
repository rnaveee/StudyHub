export type StudyUser = {
  id: string;
  name: string;
  major: string;
  color: string;
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
  onGoing: true;
};

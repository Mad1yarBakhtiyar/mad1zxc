export type User={id:number;name:string;email:string;group?:string;role:'student'|'teacher'};
export type Subject={id:number;name:string;description:string;icon:string};
export type Test={id:number;subject_id:number;title:string;description:string;duration:number;pass_score:number;published:boolean;subject:string;icon:string;question_count:number};
export type Question={id:number;text:string;options:string[];correct?:number;explanation?:string;points:number};
export type Attempt={id:number;student_id?:number;test_id:number;title:string;subject:string;questions:Question[];answers:Record<string,number>;started:number;deadline:number;server_time:number;finished:number|null;score:number;earned:number;total:number;passed:number;demo:number;pass_score:number};
export type Result=Pick<Attempt,'id'|'test_id'|'title'|'subject'|'started'|'finished'|'score'|'earned'|'total'|'passed'|'demo'>&{student:string};
export type Draft={subject_id:number;title:string;description:string;duration:number;pass_score:number;published:boolean;questions:{text:string;options:string[];correct:number;explanation:string;points:number}[]};

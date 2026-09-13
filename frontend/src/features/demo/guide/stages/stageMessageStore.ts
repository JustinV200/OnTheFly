/* Keeps the result of the last staging in this tab's memory, outside the component, so the message survives the guide
   remounting (a presenter acting as another business and coming back, or the shell's account key changing). It carries
   the time it happened, so an old message reads as history rather than as something that just occurred. */
export interface StageMessage {
  tone: 'success' | 'danger';
  title: string;
  detail: string;
}

let lastMessage: StageMessage | null = null;

/** Read and replace the last staging result for this tab. */
export const stageMessageStore = {
  read(): StageMessage | null {
    return lastMessage;
  },

  write(message: StageMessage | null): void {
    lastMessage = message;
  },
};

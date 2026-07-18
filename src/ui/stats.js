// tiny shared stats bus: the render loop writes, the dashboard window reads
export const stats = {
  fps: 0,
  startedAt: Date.now(),
};

export const normalizeJsonString = (text: string): string => {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ?? text.match(/(\{[\s\S]*\})/);
  return jsonMatch?.[1] ?? text.trim();
};

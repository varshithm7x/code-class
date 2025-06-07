export const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) {
    return 'N/A';
  }

  try {
    const d = new Date(date);
    // Check if the date is valid
    if (isNaN(d.getTime())) {
      return 'Invalid Date';
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    return 'Invalid Date';
  }
}; 
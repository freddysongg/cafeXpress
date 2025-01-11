import db from '@config/database';
import { myTable } from '@config/schemas';

export const fetchAllItems = async () => {
  return await db.select().from(myTable);
};

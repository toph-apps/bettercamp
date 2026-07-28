import {
  getEstablishment,
  getHealth,
  getSector,
  getSite,
  listEstablishments,
  search,
} from "../db/queries";

export const api = {
  establishments: () => listEstablishments(),
  establishment: (id: string) => getEstablishment(id),
  sector: (id: string) => getSector(id),
  site: (id: string) => getSite(id),
  search,
  health: () => getHealth(),
};

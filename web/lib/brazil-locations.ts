export const BRAZIL_STATES = [
  { uf: 'AC', name: 'Acre' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Pará' },
  { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondônia' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'TO', name: 'Tocantins' },
] as const;

type IbgeCity = {
  nome: string;
};

const citiesCache = new Map<string, string[]>();

export async function fetchBrazilCities(uf: string) {
  const normalizedUf = uf.trim().toUpperCase();
  if (!BRAZIL_STATES.some((state) => state.uf === normalizedUf)) {
    return [];
  }

  const cached = citiesCache.get(normalizedUf);
  if (cached) {
    return cached;
  }

  const response = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${normalizedUf}/municipios?orderBy=nome`,
  );

  if (!response.ok) {
    throw new Error('Nao foi possivel carregar as cidades agora.');
  }

  const data = (await response.json()) as IbgeCity[];
  const cities = data
    .map((city) => city.nome)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, 'pt-BR'));

  citiesCache.set(normalizedUf, cities);
  return cities;
}

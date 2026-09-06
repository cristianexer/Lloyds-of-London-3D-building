import { mkdir, writeFile } from 'node:fs/promises';
import { parts } from '../src/model/building';
import { assemblies, systems } from '../src/model/catalogue';
import { sources } from '../src/data/sources';
await mkdir('public/data', { recursive: true });
const tree = {
  id: 'lloyds-building',
  name: 'Lloyd’s of London',
  accuracy: 'Reference-based reconstruction, not a survey',
  coordinateConvention:
    '+X approximately Lime Street side; +Z approximately Leadenhall Place end; model units not certified metres',
  systems: systems.map((system) => ({
    ...system,
    assemblies: assemblies
      .filter((a) => a.system === system.id)
      .map((a) => ({ ...a, components: parts.filter((p) => p.assembly === a.id) })),
  })),
};
await writeFile('public/data/components.json', JSON.stringify(tree));
await writeFile('public/data/sources.json', JSON.stringify(sources, null, 2));
console.log(
  `Exported ${parts.length} components, ${assemblies.length} assemblies, ${systems.length} systems.`,
);

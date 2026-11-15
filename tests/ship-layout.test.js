import { describe,it,expect } from 'vitest';
import { SHIP_DECK_LAYOUTS,shipHatchStyle } from '../src/ui/v4/shipLayouts.js';

describe('Reevaluation D.3 ship layout geometry',()=>{
 it('uses four different layouts with six departments each',()=>{
   const ships=Object.values(SHIP_DECK_LAYOUTS);
   expect(ships).toHaveLength(4);
   expect(new Set(ships.map(ship=>ship.pattern)).size).toBe(4);
   ships.forEach(ship=>expect(Object.keys(ship.rooms)).toHaveLength(6));
 });
 it('positions each department according to the selected spacecraft',()=>{
   expect(shipHatchStyle('explorer','lifeSupport')).not.toEqual(shipHatchStyle('titan','lifeSupport'));
   expect(shipHatchStyle('horizon','power')).not.toEqual(shipHatchStyle('nova','power'));
 });
 it('does not introduce game-rule changes',()=>{
   for(const ship of Object.values(SHIP_DECK_LAYOUTS)){
      expect(ship.rooms.lifeSupport).toBeDefined();
      expect(ship.rooms.greenhouse).toBeDefined();
      expect(ship.rooms.science).toBeDefined();
      expect(ship.rooms.power).toBeDefined();
      expect(ship.rooms.shield).toBeDefined();
      expect(ship.rooms.comms).toBeDefined();
   }
 });
});

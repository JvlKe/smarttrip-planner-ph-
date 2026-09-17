import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const destinations = [
  ['manila-intramuros','Manila & Intramuros','National Capital Region','Metro Manila',14.5896,120.9747,'Historic walls, museums, churches, food districts, and modern city experiences.',['November','December','January','February'],['History','Food','Culture','City'],3,1800,6000],
  ['baguio','Baguio','Cordillera Administrative Region','Benguet',16.4023,120.5960,'The Summer Capital, known for cool weather, parks, markets, art, and mountain scenery.',['November','December','January','February','March'],['Nature','Food','Culture','Mountains'],3,1800,5000],
  ['vigan','Vigan','Ilocos Region','Ilocos Sur',17.5747,120.3869,'A UNESCO heritage city of preserved streets, ancestral houses, crafts, and Ilocano cuisine.',['November','December','January','February'],['History','Food','Culture','Architecture'],3,1600,4500],
  ['batanes','Batanes','Cagayan Valley','Batanes',20.4487,121.9702,'Rolling hills, dramatic coastlines, stone houses, and distinctive Ivatan culture.',['March','April','May','November'],['Nature','Culture','Photography','Adventure'],5,3000,8000],
  ['baler','Baler','Central Luzon','Aurora',15.7589,121.5623,'A Pacific surf town with beaches, waterfalls, history, and forested mountain routes.',['October','November','December','January','February'],['Surfing','Beach','Nature','Adventure'],3,1800,5000],
  ['tagaytay','Tagaytay','CALABARZON','Cavite',14.1153,120.9621,'A cool highland escape overlooking Taal Lake, popular for food, relaxation, and short trips.',['November','December','January','February'],['Food','Nature','Relaxation','Family'],2,2000,6500],
  ['el-nido','El Nido','MIMAROPA','Palawan',11.1956,119.4075,'Limestone lagoons, hidden beaches, marine sanctuaries, and renowned island-hopping routes.',['December','January','February','March','April','May'],['Beach','Island Hopping','Diving','Nature'],5,2800,8500],
  ['coron','Coron','MIMAROPA','Palawan',12.0000,120.2040,'Clear lakes, limestone cliffs, reefs, hot springs, and world-class wreck diving.',['December','January','February','March','April','May'],['Diving','Island Hopping','Nature','Adventure'],5,2800,8500],
  ['albay-mayon','Albay & Mayon Volcano','Bicol Region','Albay',13.2548,123.6861,'Volcanic landscapes, heritage towns, Bicolano food, and outdoor adventures around Mayon.',['March','April','May','November'],['Nature','Adventure','Food','Photography'],4,1800,5000],
  ['boracay','Boracay','Western Visayas','Aklan',11.9674,121.9248,'Powder-white beaches, clear water, sunsets, water sports, dining, and nightlife.',['November','December','January','February','March','April','May'],['Beach','Water Sports','Nightlife','Food'],4,2500,9000],
  ['siquijor','Siquijor','Negros Island Region','Siquijor',9.1999,123.5952,'Waterfalls, quiet beaches, marine sanctuaries, heritage sites, and island-road adventures.',['November','December','January','February','March','April','May'],['Beach','Nature','Diving','Culture'],4,1800,5000],
  ['cebu','Cebu','Central Visayas','Cebu',10.3157,123.8854,'History, city life, beaches, diving, waterfalls, and diverse day trips across the province.',['December','January','February','March','April','May'],['History','Beach','Diving','Food','Adventure'],5,2200,7000],
  ['bohol-panglao','Bohol & Panglao','Central Visayas','Bohol',9.5782,123.7457,'Chocolate Hills, tarsiers, river cruises, heritage churches, beaches, and diving.',['December','January','February','March','April','May'],['Nature','Beach','Family','Diving','Culture'],4,2200,7000],
  ['kalanggaman-leyte','Kalanggaman Island & Leyte','Eastern Visayas','Leyte',11.1123,124.2442,'A celebrated sandbar paired with Leyte heritage, marine life, and island landscapes.',['February','March','April','May'],['Beach','Island Hopping','Nature','Photography'],4,2200,6500],
  ['zamboanga','Zamboanga City & Santa Cruz Islands','Zamboanga Peninsula','Zamboanga del Sur',6.9214,122.0790,'Colorful beaches, Chavacano heritage, seafood, crafts, and multicultural city experiences.',['January','February','March','April'],['Culture','Beach','Food','History'],4,1900,5500],
  ['camiguin','Camiguin','Northern Mindanao','Camiguin',9.1732,124.7299,'A compact volcanic island of springs, waterfalls, diving, beaches, and historic ruins.',['March','April','May','October'],['Nature','Diving','Adventure','Relaxation'],4,1900,5500],
  ['davao-samal','Davao City & Samal Island','Davao Region','Davao del Norte',7.0731,125.6128,'A gateway to food, culture, wildlife, highlands, and Samal Island beaches.',['December','January','February','March','April','May'],['City','Food','Nature','Beach','Family'],5,2200,7000],
  ['lake-sebu','Lake Sebu','SOCCSKSARGEN','South Cotabato',6.2241,124.6942,'Lakes, waterfalls, highland scenery, Tboli culture, weaving, and eco-adventures.',['November','December','January','February','March'],['Culture','Nature','Adventure','Photography'],3,1600,4500],
  ['siargao','Siargao','Caraga','Surigao del Norte',9.8482,126.0458,'Surf breaks, lagoons, coconut landscapes, island hopping, and laid-back island life.',['March','April','May','June','July','August','September'],['Surfing','Beach','Island Hopping','Nature'],5,2300,7500],
  ['tawi-tawi','Tawi-Tawi','BARMM','Tawi-Tawi',5.1338,120.2927,'Southern island landscapes, marine culture, sacred sites, crafts, and distinctive Sama heritage.',['February','March','April'],['Culture','Nature','History','Photography'],4,2500,7000]
].map(([slug,name,region,province,latitude,longitude,description,bestMonths,interests,suggestedDays,dailyBudgetMin,dailyBudgetMax]) => ({slug,name,region,province,latitude,longitude,description,bestMonths,interests,suggestedDays,dailyBudgetMin,dailyBudgetMax}));

for (const destination of destinations) {
  await prisma.destination.upsert({where:{slug:destination.slug},update:destination,create:destination});
}
console.log(`Seeded ${destinations.length} destinations.`);
await prisma.$disconnect();

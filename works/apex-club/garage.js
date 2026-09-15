import {setupLanguage,tr} from './localization.js';
setupLanguage();
import * as THREE from 'three';
import {makeCraft,configureKart} from './kart-model.js';
import {craftDefs} from './kart-catalog.js';
import {applyCustomization,animateExhaust} from './kart-customization.js';
import {readGarage,saveCar,DEFAULT_CUSTOMIZATION} from './garage-config.js';
import {createVehicleEnvironment} from './vehicle-finish.js';
try{
const canvas=document.querySelector('#view'),host=canvas.parentElement;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x1b2b32);scene.fog=new THREE.Fog(0x1b2b32,80,140);
const camera=new THREE.PerspectiveCamera(37,1,.1,200);scene.add(new THREE.HemisphereLight(0xe0faff,0x30383d,.9));
for(const [color,intensity,position] of [[0xffe4c5,2.7,[20,35,25]],[0x96c6d6,1.5,[-22,15,-20]],[0xffffff,1.4,[-15,18,25]]]){const light=new THREE.DirectionalLight(color,intensity);light.position.set(...position);scene.add(light);if(color===0xffe4c5){light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:1,far:90});light.shadow.normalBias=.025;}}
const environment=createVehicleEnvironment(renderer);scene.environment=environment.texture;
const car=makeCraft();scene.add(car);car.userData.shadow.visible=false;
const query=new URLSearchParams(location.search);let selected=/^[0-5]$/.test(query.get('craft')||'')?Number(query.get('craft')):4,config,boostPreview=false;
const fields={paint:'#bodyColor',finish:'#paintFinish',livery:'#paintLivery',accent:'#accentColor',exhaust:'#exhaustStyle',flame:'#flameColor'};
const status=document.querySelector('#customStatus');
function updateLinks(){const sceneName=query.get('scene')==='citadel'?'citadel':'bay';document.querySelectorAll('a[href*="index.html"]').forEach(a=>a.href=`./index.html?craft=${selected}&scene=${sceneName}`);}
function refreshCar(){
 const d=craftDefs[selected];applyCustomization(car,config,d.style==='rally'?0x1497a0:d.color);
 car.traverse(o=>{if(o.isMesh){o.castShadow=!o.material?.isShaderMaterial&&!o.userData.cosmeticDecal;o.receiveShadow=!o.userData.cosmeticDecal;if(o.material&&!o.material.isShaderMaterial)o.material.wireframe=document.querySelector('#wireframe').checked;}});
 car.userData.model.getObjectByName('Race driver').visible=document.querySelector('#driver').checked;
 for(const [key,selector]of Object.entries(fields))document.querySelector(selector).value=config[key]||(d.style==='rally'?'#1497a0':'#'+d.color.toString(16).padStart(6,'0'));
 document.querySelector('#accentField').hidden=config.livery==='solid';document.querySelector('#flameColor').disabled=config.exhaust==='off';document.querySelector('#previewBoost').disabled=config.exhaust==='off';
 document.querySelectorAll('[data-flame]').forEach(b=>{const on=b.dataset.flame===config.flame;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));b.disabled=config.exhaust==='off';});
 document.querySelectorAll('[data-color]').forEach(b=>{const on=b.dataset.color===document.querySelector('#bodyColor').value;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
}
function persist(){const saved=saveCar(undefined,selected,config);refreshCar();status.textContent=tr(saved?'Saved on this device · Ready to race':'Preview only · Browser could not save changes');}
function selectCar(index){selected=index;configureKart(car,craftDefs[index]);config={...DEFAULT_CUSTOMIZATION,...readGarage().cars[index]};refreshCar();
 document.querySelector('#garageName').textContent=craftDefs[index].name;document.querySelector('#garageType').textContent=tr(craftDefs[index].title);canvas.setAttribute('aria-label',craftDefs[index].name+' 3D vehicle. Drag to rotate.');
 document.querySelectorAll('[data-garage-car]').forEach(b=>{const on=Number(b.dataset.garageCar)===index;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
 const url=new URL(location.href);url.searchParams.set('craft',index);history.replaceState(null,'',url);updateLinks();status.textContent=tr('Saved on this device · Ready to race');
}
const fleet=document.querySelector('#garageFleet');
craftDefs.forEach((d,i)=>{const b=document.createElement('button');b.dataset.garageCar=i;b.style.setProperty('--car-color','#'+d.color.toString(16).padStart(6,'0'));b.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span><strong>${d.name}</strong><small>${tr(d.title)}</small>`;b.addEventListener('click',()=>selectCar(i));fleet.append(b);});
for(const [key,selector]of Object.entries(fields))document.querySelector(selector).addEventListener('input',e=>{config[key]=e.target.value;persist();});
document.querySelectorAll('[data-color]').forEach(b=>b.addEventListener('click',()=>{config.paint=b.dataset.color;persist();}));
document.querySelectorAll('[data-flame]').forEach(b=>b.addEventListener('click',()=>{config.flame=b.dataset.flame;persist();}));
document.querySelector('#resetCustom').addEventListener('click',()=>{config={...DEFAULT_CUSTOMIZATION};persist();});
document.querySelector('#previewBoost').addEventListener('click',e=>{boostPreview=!boostPreview;e.currentTarget.setAttribute('aria-pressed',String(boostPreview));e.currentTarget.textContent=tr(boostPreview?'Stop boost preview':'Test boost');if(boostPreview){yaw=Math.PI-.5;pitch=.3;rotate.checked=false;}});
selectCar(selected);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:0x1c2c32,roughness:.7,metalness:.18}));floor.rotation.x=-Math.PI/2;floor.position.y=-3.85;floor.receiveShadow=true;scene.add(floor);
const podium=new THREE.Mesh(new THREE.CylinderGeometry(15,15.3,.35,96),new THREE.MeshStandardMaterial({color:0x283c43,metalness:.35,roughness:.5}));podium.position.y=-3.67;podium.receiveShadow=true;scene.add(podium);
let yaw=.65,pitch=.36,distance=43,dragging=false,px=0,py=0,last=performance.now();const target=new THREE.Vector3(0,1.8,0);
const rotate=document.querySelector('#rotate');if(matchMedia('(prefers-reduced-motion: reduce)').matches)rotate.checked=false;
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;if(document.hidden)return;if(rotate.checked&&!dragging)yaw+=dt*.16;
 animateExhaust(car,now/1000,.65,boostPreview);
 camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance).add(target);camera.lookAt(target);renderer.render(scene,camera);}
canvas.addEventListener('pointerdown',e=>{dragging=true;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId);rotate.checked=false;});canvas.addEventListener('pointermove',e=>{if(!dragging)return;yaw-=(e.clientX-px)*.008;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-py)*.005,-.06,1.45);px=e.clientX;py=e.clientY;});for(const name of ['pointerup','pointercancel'])canvas.addEventListener(name,()=>dragging=false);
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.035,24,70);},{passive:false});canvas.addEventListener('keydown',e=>{if(!e.key.startsWith('Arrow'))return;e.preventDefault();rotate.checked=false;if(e.key==='ArrowLeft')yaw-=.15;if(e.key==='ArrowRight')yaw+=.15;if(e.key==='ArrowUp')pitch=Math.min(1.45,pitch+.12);if(e.key==='ArrowDown')pitch=Math.max(-.06,pitch-.12);});
const views={hero:[.65,.36],front:[0,.18],rear:[Math.PI,.25],side:[Math.PI/2,.18],top:[0,1.45]};document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{[yaw,pitch]=views[b.dataset.view];rotate.checked=false;document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));}));
document.querySelector('#driver').addEventListener('change',e=>car.userData.model.getObjectByName('Race driver').visible=e.target.checked);document.querySelector('#wireframe').addEventListener('change',e=>car.traverse(o=>{if(o.isMesh&&o.material)o.material.wireframe=e.target.checked;}));

function resize(){const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();distance=Math.max(43,15/Math.sin(Math.atan(Math.tan(37*Math.PI/360)*camera.aspect)));}new ResizeObserver(resize).observe(host);resize();requestAnimationFrame(frame);
}catch(error){document.querySelector('#error').hidden=false;console.error(error);}

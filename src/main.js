import './style.css'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// ================= GLOBAL VARIABLES =================
let mixer, activeAction, grannyPivot;
let actions = {};
const clock = new THREE.Clock();
let isAttacking = false;

// --- GLOBAL VARIABLES UNTUK FISIKA VAS ---
let vase; 
let vaseVelocityY = -0.0005; 
const GRAVITY = 0; 
let isTumbling = false; // <--- STATUS BARU: Apakah vas sedang terguling?

// Konfigurasi
const PLAYER_SPEED = 0.01;
const ATTACK_DISTANCE = 1.0;

// ================= UI KOORDINAT =================
const infoDiv = document.createElement('div');
infoDiv.style.position = 'absolute';
infoDiv.style.top = '10px';
infoDiv.style.left = '10px';
infoDiv.style.color = '#00FF00'; 
infoDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
infoDiv.style.padding = '10px';
infoDiv.style.fontFamily = 'monospace';
infoDiv.style.fontSize = '14px';
infoDiv.style.pointerEvents = 'none';
infoDiv.style.zIndex = '100';
document.body.appendChild(infoDiv);

// ================= SCENE & RENDERER =================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); 
scene.fog = new THREE.Fog(0x000000, 1, 15); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(-2.5, 0.2, -1.75); 
camera.lookAt(-1.5, -0.3, -1.75);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.4; 
document.body.appendChild(renderer.domElement);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

scene.add(new THREE.AmbientLight(0xffffff, 0.02)); 

const sunLight = new THREE.DirectionalLight(0xffffff, 0.05); 
sunLight.position.set(5, 10, 7);
sunLight.castShadow = true;
scene.add(sunLight);

// ================= CONTROLS =================
const controls = new PointerLockControls(camera, renderer.domElement);
document.addEventListener('click', () => controls.lock());

// ================= ANIMATION SYSTEM =================
function fadeToAction(name, duration = 0.2) {
    if (!actions[name] || activeAction === actions[name]) return;
    if (activeAction) activeAction.fadeOut(duration);
    activeAction = actions[name];
    activeAction.reset().fadeIn(duration).play();
}

// ================= CUSTOM OBJECTS =================
const flatBoxGeometry = new THREE.BoxGeometry(0.75, 0.025, 0.75); 

// --- BALOK 1 (Invisible / Meja Bawah) ---
const flatBoxMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x8B4513, 
    roughness: 0.9, 
    visible: false, 
});
const flatBox = new THREE.Mesh(flatBoxGeometry, flatBoxMaterial);
flatBox.position.set(-2.03, -0.31, -1.75);
scene.add(flatBox);

flatBox.updateMatrixWorld(true); 
const flatBoxBB = new THREE.Box3().setFromObject(flatBox);
const SURFACE_1_Y = flatBoxBB.max.y; 

// --- BALOK 2 (Visible / Rak Atas) ---
const flatBoxMaterialVisible = new THREE.MeshStandardMaterial({ 
    color: 0x8B4513, 
    roughness: 0.9, 
    visible: false, 
});
const flatBox2 = new THREE.Mesh(flatBoxGeometry, flatBoxMaterialVisible);
flatBox2.position.set(-1.6, -0.7, -1.75); 
scene.add(flatBox2);

flatBox2.updateMatrixWorld(true);
const flatBox2BB = new THREE.Box3().setFromObject(flatBox2);
const SURFACE_2_Y = flatBox2BB.max.y;


// ================= LOAD ASSETS =================
const loader = new GLTFLoader();

// 1. Load Rumah
loader.load('/granny_housegranny.glb', (gltf) => {
    const model = gltf.scene;
    model.scale.set(20, 20, 20);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    scene.add(model);
});

// 2. Load Granny
loader.load('/granny_animated.glb', (gltf) => {
    const grannyMesh = gltf.scene;
    grannyPivot = new THREE.Group();
    grannyPivot.position.set(-0.65, -1.93, 0); 
    grannyMesh.scale.set(0.7, 0.7, 0.7);
    grannyMesh.rotation.y = -Math.PI / 2;
    grannyPivot.add(grannyMesh);
    scene.add(grannyPivot);

    mixer = new THREE.AnimationMixer(grannyMesh);
    gltf.animations.forEach((clip) => {
        const name = clip.name.toLowerCase();
        actions[name] = mixer.clipAction(clip);
    });

    const idleKey = Object.keys(actions).find(n => n.includes('idle'));
    if (idleKey) {
        activeAction = actions[idleKey];
        activeAction.play();
    }
});

// 3. Load Locker Door
loader.load('/locker_door_separated.glb', (gltf) => {
    const locker = gltf.scene;
    locker.position.set(-0.86, 1.40, -2.42);
    locker.rotation.y = Math.PI / 2;
    locker.scale.set(50, 50, 93);
    locker.traverse((child) => {
        if (child.isMesh) child.material.color.set(0xAB7F47);
    });
    scene.add(locker);
});

// drawer kiri
loader.load('/drawer_of_blacksmith_table_-_a.glb', (gltf) => {
    const drawer = gltf.scene;
    drawer.position.set(1.9, 1.237, -0.65);
    drawer.scale.set(0.14, 0.25, 0.15); 
    drawer.rotation.y = Math.PI;
    scene.add(drawer);
});

// drawer kanan
loader.load('/drawer_of_blacksmith_table_-_a.glb', (gltf) => {
    const drawer = gltf.scene;
    drawer.position.set(1.62, 1.237, -0.65);
    drawer.scale.set(0.14, 0.25, 0.15); 
    drawer.rotation.y = Math.PI;
    scene.add(drawer);
});

// pintu kiri
loader.load('/door_granny.glb', (gltf) => {
    const door = gltf.scene;
    door.position.set(-1.04, 0.6, -0.47);
    door.rotation.y = Math.PI; 
    door.scale.set(0.046, 0.046, 0.04); 
    scene.add(door);
});

// pintu kanan
loader.load('/door_granny.glb', (gltf) => {
    const door = gltf.scene;
    door.position.set(0.995, 0.6, -0.47);
    door.rotation.y = Math.PI;
    door.scale.set(-0.046, 0.046, 0.04); 
    scene.add(door);
});

// --- LOAD VAS BUNGA ---
loader.load('/granny_vase.glb', (gltf) => {
    const rawModel = gltf.scene;

    const rawBox = new THREE.Box3().setFromObject(rawModel);
    const center = rawBox.getCenter(new THREE.Vector3());
    const bottomY = rawBox.min.y;

    rawModel.position.x -= center.x;
    rawModel.position.y -= bottomY; 
    rawModel.position.z -= center.z;

    vase = new THREE.Group();
    vase.add(rawModel); 

    vase.scale.set(0.03, 0.03, 0.03);
    
    // Spawn di TENGAH Balok 1 (-2.03)
    vase.position.set(-1.66, 0, -1.75); 
    
    scene.add(vase);

    const axesHelper = new THREE.AxesHelper(0.5);
    vase.add(axesHelper);
});

// kunci padlock
loader.load('/padlock__key.glb', (gltf) => {
    const root = gltf.scene;
    const keyMesh = root.getObjectByName('Key_Padlock_0'); 
    if (keyMesh) {
        keyMesh.position.set(-0.81, -0.05, 2.55); 
        keyMesh.scale.set(0.03, 0.03, 0.03); 
        scene.add(keyMesh);
    }
});

// padlock
loader.load('/padlock__key.glb', (gltf) => {
    const root = gltf.scene;
    const padlockGroup = new THREE.Group();
    const body = root.getObjectByName('Padlock_Padlock_0');
    const cylinder = root.getObjectByName('Cylinder_Padlock_0');
    const shackle = root.getObjectByName('Shakle_Padlock_0'); 

    if (body) padlockGroup.add(body);
    if (cylinder) padlockGroup.add(cylinder);
    if (shackle) {
        shackle.position.set(0.64, 0, 0.6);
        padlockGroup.add(shackle);
    }

    padlockGroup.position.set(-0.4, 0, 2.605); 
    padlockGroup.rotation.x = -Math.PI / 2;
    padlockGroup.scale.set(0.03, 0.03, 0.03);
    scene.add(padlockGroup);
});

// plank atas
loader.load('/plank.glb', (gltf) => {
    const plank = gltf.scene;
    plank.position.set(-0.05, 0.4, 2.62); 
    plank.rotation.x = -Math.PI / 2; 
    plank.scale.set(3.5, 3, 3); 
    scene.add(plank);
});

// plank bawah
loader.load('/plank.glb', (gltf) => {
    const plank = gltf.scene;
    plank.position.set(-0.05, 0, 2.62); 
    plank.rotation.x = -Math.PI / 2; 
    plank.scale.set(3.5, 3, 3); 
    scene.add(plank);
});

// ================= INPUT SYSTEM =================
const keyState = {};
document.addEventListener('keydown', (e) => keyState[e.code] = true);
document.addEventListener('keyup', (e) => keyState[e.code] = false);


function handleMovement() {
    if (controls.isLocked) {
        if (keyState['KeyW']) controls.moveForward(PLAYER_SPEED);
        if (keyState['KeyS']) controls.moveForward(-PLAYER_SPEED);
        if (keyState['KeyA']) controls.moveRight(-PLAYER_SPEED);
        if (keyState['KeyD']) controls.moveRight(PLAYER_SPEED);
        if (keyState['Space']) camera.position.y += 0.01;
        if (keyState['ShiftLeft']) camera.position.y -= 0.01;
    }

    if (vase) {
        // 1. Gravitasi
        vaseVelocityY = -0.0005; 
        vaseVelocityY -= GRAVITY; 
        vase.position.y += vaseVelocityY;

        // 2. Cek apakah masuk Area 1 (Box Atas/Meja)
        const inArea1 = 
            vase.position.x >= flatBoxBB.min.x && 
            vase.position.x <= flatBoxBB.max.x &&
            vase.position.z >= flatBoxBB.min.z && 
            vase.position.z <= flatBoxBB.max.z;

        // 3. Cek apakah masuk Area 2 (Box Bawah/Lantai)
        const inArea2 = 
            vase.position.x >= flatBox2BB.min.x && 
            vase.position.x <= flatBox2BB.max.x &&
            vase.position.z >= flatBox2BB.min.z && 
            vase.position.z <= flatBox2BB.max.z;

        // --- LOGIKA UTAMA ---

        // A. Cek Finish Line (Lantai / Box 2)
        // Kalau sudah sampai lantai, stop semuanya.
        if (inArea2 && vase.position.y <= SURFACE_2_Y) {
            vase.position.y = SURFACE_2_Y;
            vaseVelocityY = 0;
            isTumbling = false; // Matikan mode terguling
        }
        
        // B. Cek Pemicu Awal (Meja / Box 1)
        // Kalau kena meja, nyalakan 'isTumbling' tapi JANGAN stop Y-nya.
        else if (inArea1 && vase.position.y <= SURFACE_1_Y) {
            isTumbling = true; // AKTIFKAN MODE TERGULING
        }

        // C. Saat Mode Terguling Aktif (Jatuh di Udara)
        if (isTumbling) {
            // Selama tumbling aktif, dia akan geser kanan & muter
            // meskipun sudah tidak nempel meja lagi (di udara).
            vase.position.x += 0.0005; // Geser Kanan
            vase.rotation.z -= 0.00585;   // Muter
        }

        // Reset
        if (vase.position.y < -5) {
            vase.position.set(-2.03, 0.5, -1.75); 
            vase.rotation.set(0, 0, 0); 
            vaseVelocityY = 0;
            isTumbling = false; // Reset status
        }
    }
}

// ================= MAIN LOOP =================
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (mixer) mixer.update(delta);

    const x = camera.position.x.toFixed(2);
    const y = camera.position.y.toFixed(2);
    const z = camera.position.z.toFixed(2);
    infoDiv.innerText = `KOORDINAT PLAYER - X: ${x} | Y: ${y} | Z: ${z}`;

    if (grannyPivot) {
        const distance = grannyPivot.position.distanceTo(camera.position);
        grannyPivot.lookAt(camera.position.x, grannyPivot.position.y, camera.position.z);

        if (distance < ATTACK_DISTANCE) {
            if (!isAttacking) {
                isAttacking = true;
                const hitKey = Object.keys(actions).find(n => n.includes('hit') && !n.includes('arrow'));
                if (hitKey) {
                    fadeToAction(hitKey, 0.1);
                    setTimeout(() => { 
                        isAttacking = false; 
                        const idleKey = Object.keys(actions).find(n => n.includes('idle'));
                        if (idleKey) fadeToAction(idleKey, 0.5);
                    }, 1500); 
                }
            }
        }
    }

    handleMovement();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
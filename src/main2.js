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
const dummyTarget = new THREE.Object3D(); 
const targetPos = new THREE.Vector3();

// --- GLOBAL VARIABLES UNTUK FISIKA VAS ---
let vase; 
let vaseVelocityY = -0.0005; 
const GRAVITY = 0; 
let isTumbling = false; // <--- STATUS BARU: Apakah vas sedang terguling?
let rollSpeed = 0;

// 1. Variabel global untuk menyimpan referensi
let doorHinge;
let door;
let isOpen = false;

let drawerLeft, drawerRight;
let isDrawerOpen = false;

let lockerHinge;

let heldKey;

// Konfigurasi
const PLAYER_SPEED = 0.01;
const ATTACK_DISTANCE = 1.0;

//padlock
let padlockGroup;
let isPadlockFalling = false;
let padlockVelocityY = 0;

// Variabel untuk Papan (Plank)
let plankVelocity = 0;
let isPlankDrop = false;
let plankPivot;

// ================= KAMERA POSITIONS (FITUR BARU) =================
// Daftar koordinat yang diminta
const cameraPositions = [
    {
        pos: new THREE.Vector3(-0.39, -0.99, 0.15),
        target: new THREE.Vector3(-4.47, -1.60, -2.68)
        
    },
    {
        // Kamera 2
        pos: new THREE.Vector3(-1.56, -0.1, -1.24),
        target: new THREE.Vector3(-1.82, 0.12, -6.22)
    },
    {
        // Kamera 3
        pos: new THREE.Vector3(-1.46, -0.11, -1.44),
        target: new THREE.Vector3(-0.85, -2.83, -5.71)
    },
    {
        // Kamera 4
        pos: new THREE.Vector3(-1.39, -0.56, -1.57),
        target: new THREE.Vector3(-0.45, -3.46, -5.53)
    },
    {
        //kamera 5
        pos: new THREE.Vector3(0.31, 1.38, -0.09),
        target: new THREE.Vector3(3.29, 0.77, -4.08)
    },
    {
        //kamera 6
        pos: new THREE.Vector3(-2.07, -0.00, 0.20),
        target: new THREE.Vector3(-4.10, -0.17, 4.77)
    },
    {
        //kamera 7
        pos: new THREE.Vector3(1.32, 1.19, -1.53),
        target: new THREE.Vector3(4.91, 0.83, -4.99)
    },
    {
        //kamera 8
        pos: new THREE.Vector3(-1.25, 0.29, 1.66),
        target: new THREE.Vector3(1.11, 0.66, -2.73)
    },
    {
        //kamera 9
        pos: new THREE.Vector3(-0.73, -0.04, 2.03),
        target: new THREE.Vector3(1.30, -0.50, 6.58)
    },
    {
        //kamera 10
        pos: new THREE.Vector3(0.39, 1.26, -0.40),
        target: new THREE.Vector3(3.92, 1.13, -3.93)
    },
    {
        //kamera 11
        pos: new THREE.Vector3(0.71, 0.70, -2.27),
        target: new THREE.Vector3(4.44, 0.97, 1.05)
    },
    {
        //kamera 12
        pos: new THREE.Vector3(-0.66, 1.26, -1.46),
        target: new THREE.Vector3(-0.53, 1.00, -6.45)
    },
    {
        //kamera 13
        pos: new THREE.Vector3(-0.46, -0.24, 2.08),
        target: new THREE.Vector3(-5.46, -0.26, 1.99)
    }
];
let currentCamIndex = -1; // -1 artinya belum menggunakan preset, masih default

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
// Posisi Default Awal
camera.position.set(-1.56, -0.1, -1.24);
camera.lookAt(-2.08, 0.15, -6.19);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.15; 
document.body.appendChild(renderer.domElement);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

scene.add(new THREE.AmbientLight(0xffffff, 0.02)); 

const sunLight = new THREE.DirectionalLight(0xffffff, 0.05); 
sunLight.position.set(5, 10, 7);
sunLight.castShadow = true;
scene.add(sunLight);

scene.add(camera);

// =========================================================
// LIGHTING SETUP (LAMPU + BLOCKER)
// =========================================================

const blockerGeometry = new THREE.BoxGeometry(4, 0.1, 4); 
const blockerMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
blockerMaterial.colorWrite = false; 
blockerMaterial.depthWrite = false; 

// SET 1
const bulbLight1 = new THREE.PointLight(0xFFFFFF, 10, 5); 
bulbLight1.position.set(-1.8, 0.4, -1.6); 
bulbLight1.castShadow = false; 
bulbLight1.shadow.mapSize.set(1024, 1024);
bulbLight1.shadow.camera.near = 0.1;
bulbLight1.shadow.bias = -0.0005;
scene.add(bulbLight1);

const blocker1 = new THREE.Mesh(blockerGeometry, blockerMaterial);
blocker1.position.set(-1.8, 0.6, -1.6); 
blocker1.castShadow = false;
blocker1.receiveShadow = false;
scene.add(blocker1);

// SET 2
const bulbLight2 = new THREE.PointLight(0xFFFFFF, 10, 5); 
bulbLight2.position.set(1.8, 0.4, -1.6); 
bulbLight2.castShadow = false; 
bulbLight2.shadow.mapSize.set(1024, 1024);
bulbLight2.shadow.camera.near = 0.1;
bulbLight2.shadow.bias = -0.0005;
scene.add(bulbLight2);

const blocker2 = new THREE.Mesh(blockerGeometry, blockerMaterial);
blocker2.position.set(1.8, 0.6, -1.6);
blocker2.castShadow = false;
blocker2.receiveShadow = false;
scene.add(blocker2);

// SET 3
const bulbLight3 = new THREE.PointLight(0xFFFFFF, 5, 5); 
bulbLight3.position.set(2.6, 0.4, 1.05); 
bulbLight3.castShadow = false; 
bulbLight3.shadow.mapSize.set(1024, 1024);
bulbLight3.shadow.camera.near = 0.1;
bulbLight3.shadow.bias = -0.0005;
scene.add(bulbLight3);

const blocker3 = new THREE.Mesh(blockerGeometry, blockerMaterial);
blocker3.position.set(2.6, 0.6, 1.05);
blocker3.castShadow = false;
blocker3.receiveShadow = false;
scene.add(blocker3);

// SET 4
const bulbLight4 = new THREE.PointLight(0xFFFFFF, 5, 5); 
bulbLight4.position.set(-2.6, 0.4, 1.2); 
bulbLight4.castShadow = false; 
bulbLight4.shadow.mapSize.set(1024, 1024); 
bulbLight4.shadow.camera.near = 0.1;
bulbLight4.shadow.bias = -0.0005;
scene.add(bulbLight4);

const blocker4 = new THREE.Mesh(blockerGeometry, blockerMaterial);
blocker4.position.set(-2.6, 0.6, 1.2); 
blocker4.castShadow = false;
blocker4.receiveShadow = false;
scene.add(blocker4);

// SET 5
const bulbLight5 = new THREE.PointLight(0xFFFFFF, 15, 5); 
bulbLight5.position.set(-0.15, 1.8, 1.4); 
bulbLight5.castShadow = false; 
bulbLight5.shadow.mapSize.set(1024, 1024); 
bulbLight5.shadow.camera.near = 0.1;
bulbLight5.shadow.bias = -0.0005;
scene.add(bulbLight5);

// SET 6
const bulbLight6 = new THREE.PointLight(0xFFFFFF, 5, 5); 
bulbLight6.position.set(-2.6, 1.8, 1.3); 
bulbLight6.castShadow = false; 
bulbLight6.shadow.mapSize.set(1024, 1024); 
bulbLight6.shadow.camera.near = 0.1;
bulbLight6.shadow.bias = -0.0005;
scene.add(bulbLight6);

// SET 7
const bulbLight7 = new THREE.PointLight(0xFFFFFF, 7.5, 5); 
bulbLight7.position.set(-2.1, 1.8, -1.6); 
bulbLight7.castShadow = false; 
bulbLight7.shadow.mapSize.set(1024, 1024); 
bulbLight7.shadow.camera.near = 0.1;
bulbLight7.shadow.bias = -0.0005;
scene.add(bulbLight7);

// SET 8
const bulbLight8 = new THREE.PointLight(0xFFFFFF, 7.5, 5); 
bulbLight8.position.set(1.5, 1.8, -1.75); 
bulbLight8.castShadow = false; 
bulbLight8.shadow.mapSize.set(1024, 1024); 
bulbLight8.shadow.camera.near = 0.1;
bulbLight8.shadow.bias = -0.0005;
scene.add(bulbLight8);

// SET 9
const bulbLight9 = new THREE.PointLight(0xFFFFFF, 2.5, 5); 
bulbLight9.position.set(3.5, 1.8, -1.5); 
bulbLight9.castShadow = false; 
bulbLight9.shadow.mapSize.set(1024, 1024); 
bulbLight9.shadow.camera.near = 0.1;
bulbLight9.shadow.bias = -0.0005;
scene.add(bulbLight9);

// SET 10
const bulbLight10 = new THREE.PointLight(0xFFFFFF, 5, 5); 
bulbLight10.position.set(2.6, 1.8, 1.05); 
bulbLight10.castShadow = false; 
bulbLight10.shadow.mapSize.set(1024, 1024);
bulbLight10.shadow.camera.near = 0.1;
bulbLight10.shadow.bias = -0.0005;
scene.add(bulbLight10);


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
const flatBoxGeometry = new THREE.BoxGeometry(0.75, 0.025, 1.5); 

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
flatBox2.position.set(-1.6, -0.73, -1.75); 
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
    
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.material.side = THREE.DoubleSide; 
            child.material.shadowSide = THREE.DoubleSide; 
        }
    });

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

    const idleKey = Object.keys(actions).find(n => n.includes('idle_1'));
    if (idleKey) {
        activeAction = actions[idleKey];
        activeAction.play();
    }
});

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

    const idleKey = Object.keys(actions).find(n => n.includes('walk'));
    if (idleKey) {
        activeAction = actions[idleKey];
        activeAction.play();
    }
});

// 3. Load Locker Door
loader.load('/locker_door_separated.glb', (gltf) => {
    const lockerMesh = gltf.scene;
    
    lockerHinge = new THREE.Group();
    lockerMesh.position.set(0.0002, 0, 0); 
    
    lockerHinge.add(lockerMesh);

    lockerHinge.position.set(-0.58 , 1.40, -2.415);
    lockerHinge.rotation.y = -Math.PI * 0.5;
    lockerHinge.scale.set(50, 50, 95);
    
    lockerMesh.traverse((child) => {
        if (child.isMesh) child.material.color.set(0xAB7F47);
    });
    
    scene.add(lockerHinge);
});

// drawer kiri
loader.load('/drawer_of_blacksmith_table_-_a.glb', (gltf) => {
    drawerLeft = gltf.scene; 
    drawerLeft.position.set(1.9, 1.237, -0.65);
    drawerLeft.scale.set(0.14, 0.25, 0.15); 
    drawerLeft.rotation.y = Math.PI;
    scene.add(drawerLeft);
});

// drawer kanan
loader.load('/drawer_of_blacksmith_table_-_a.glb', (gltf) => {
    drawerRight = gltf.scene; 
    drawerRight.position.set(1.62, 1.237, -0.65);
    drawerRight.scale.set(0.14, 0.25, 0.15);
    drawerRight.rotation.y = Math.PI;
    scene.add(drawerRight);
});

// pintu kiri
loader.load('/door_granny.glb', (gltf) => {
    const door = gltf.scene;
    door.position.set(-0.35, 0.6, -0.47);
    door.rotation.y = -Math.PI * 0.5; 
    door.scale.set(0.046, 0.046, 0.04); 
    scene.add(door);
});

// pintu kanan
loader.load('/door_granny.glb', (gltf) => {
    const doorMesh = gltf.scene;
    doorHinge = new THREE.Group();
    doorMesh.position.set(0.5, 0, 0); 
    doorHinge.add(doorMesh);
    doorHinge.position.set(0.995, 0.6, -0.47);
    doorHinge.rotation.y = Math.PI;
    doorHinge.scale.set(-0.048, 0.046, 0.04); 
    
    scene.add(doorHinge);
});

// --- LOAD VAS BUNGA ---
loader.load('/granny_vase.glb', (gltf) => {
    const rawModel = gltf.scene;

    rawModel.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true; 
            child.receiveShadow = true; 
        }
    });

    const rawBox = new THREE.Box3().setFromObject(rawModel);
    const center = rawBox.getCenter(new THREE.Vector3());
    const bottomY = rawBox.min.y;

    rawModel.position.x -= center.x;
    rawModel.position.y -= bottomY; 
    rawModel.position.z -= center.z;

    vase = new THREE.Group();
    vase.add(rawModel); 

    vase.scale.set(0.03, 0.03, 0.03);
    vase.position.set(-1.66, 0, -1.75); 
    
    scene.add(vase);
});

// Load Kunci
loader.load('/padlock__key.glb', (gltf) => {
    const root = gltf.scene;
    // Cari mesh kuncinya (sesuaikan nama kalau beda)
    heldKey = root.getObjectByName('Key_Padlock_0'); 
    
    if (heldKey) {
        // HAPUS/KOMENTAR BARIS LAMA:
        // keyMesh.position.set(-0.81, -0.05, 2.55); 
        // scene.add(keyMesh);

        // GANTI DENGAN INI:
        camera.add(heldKey); // Tempel ke kamera

        // Atur posisi RELATIF terhadap kamera (bukan koordinat dunia)
        // X: Kanan/Kiri, Y: Atas/Bawah, Z: Depan/Belakang (Minus itu depan)
        heldKey.position.set(0.4, -0.25, -0.5); 
        
        // Atur rotasi biar kuncinya menghadap ke depan enak dilihat
        heldKey.rotation.set(0, Math.PI, -Math.PI/2); // Sesuaikan angle-nya
        
        // Skala mungkin perlu disesuaikan karena jaraknya dekat sekali dengan mata
        heldKey.scale.set(0.055, 0.055, 0.055); 
        
        // Pastikan materialnya tidak tembus tembok (opsional, render order)
        heldKey.material.depthTest = false; // Trik biar kunci selalu di atas segalanya (opsional)
        heldKey.renderOrder = 999; 
    }
});

// kunci padlock
/*
loader.load('/padlock__key.glb', (gltf) => {
    const root = gltf.scene;
    const keyMesh = root.getObjectByName('Key_Padlock_0'); 
    if (keyMesh) {
        keyMesh.position.set(-0.81, -0.05, 2.55); 
        keyMesh.scale.set(0.03, 0.03, 0.03); 
        scene.add(keyMesh);
    }
});
*/

// padlock
loader.load('/padlock__key.glb', (gltf) => {
    const root = gltf.scene;
    padlockGroup = new THREE.Group();
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
function updateFallingInteractions() {
    if (clock.getElapsedTime() > 36.5) {
        isPadlockFalling = true;
    }
    const GROUND_Y = -0.77;

    if (padlockGroup) {
        if (isPadlockFalling) {
            padlockVelocityY -= 0.001;
            padlockGroup.position.y += padlockVelocityY;
            if (padlockGroup.position.y <= GROUND_Y) {
                padlockGroup.position.y = GROUND_Y;
                padlockVelocityY = 0;
            }
        }
    }
}

// plank atas
loader.load('/plank.glb', (gltf) => {
    const plankMesh = gltf.scene;

    plankPivot = new THREE.Group();
    plankPivot.position.set(0.34, 0, 2.62); 

    const axesHelper = new THREE.AxesHelper(2);
    plankPivot.add(axesHelper);

    plankPivot.add(plankMesh);
    plankMesh.position.set(-0.37, 0.4, 0); 

    plankMesh.rotation.x = -Math.PI / 2; 
    plankMesh.scale.set(3.5, 3, 3); 

    scene.add(plankPivot);
});

function updatePlankPhysics() {
    // --- TAMBAHAN LOGIKA WAKTU ---
    // Jika waktu > 39 detik, aktifkan jatuhnya papan
    if (clock.getElapsedTime() > 36.5) {
        isPlankDrop = true;
    }
    // -----------------------------

    // Cek apakah pivot sudah ada dan trigger sudah aktif
    if (!plankPivot || !isPlankDrop) return;

    // TARGET: 90 Derajat (Jatuh)
    const targetRotation = Math.PI / 2; 

    if (plankPivot.rotation.z < targetRotation) {
        plankVelocity += 0.0015; 
        plankPivot.rotation.z += plankVelocity; 

        // Stop dan efek membal sedikit saat sampai bawah
        if (plankPivot.rotation.z > targetRotation) {
            plankPivot.rotation.z = targetRotation;
            plankVelocity = -plankVelocity * 0.3; 
            
            if (Math.abs(plankVelocity) < 0.001) {
                plankVelocity = 0;
            }
        }
    }
}
// plank bawah
loader.load('/plank.glb', (gltf) => {
    const plank = gltf.scene;
    plank.position.set(-0.05, 0, 2.62); 
    plank.rotation.x = -Math.PI / 2; 
    plank.scale.set(3.5, 3, 3); 
    scene.add(plank);
});
// ================= KACA =================
//Glass Door
loader.load('/glass_door.glb', (gltf) => {
    const glassDoor = gltf.scene;
    glassDoor.position.set(0.46, 0.18, 0.84);
    glassDoor.scale.set(0.0000007, 0.00047, 0.0475); 
    glassDoor.traverse((child) => {
        if (child.isMesh) {
            child.material.transparent = true;
            child.material.opacity = 0.2; 
            child.material.roughness = 0.1; 
            child.material.metalness = 0.1; 
            child.material.side = THREE.DoubleSide; 
        }
    });
    scene.add(glassDoor);
});

// ================= INPUT SYSTEM =================
const keyState = {};
document.addEventListener('keydown', (e) => {
    keyState[e.code] = true;
    // ============================================
    // LOGIKA GANTI KAMERA (KEY C)
    // ============================================
    if (e.code === 'KeyC') {
        currentCamIndex = (currentCamIndex + 1) % cameraPositions.length;
        
        const camData = cameraPositions[currentCamIndex];
        
        // 1. Pindah posisi
        camera.position.copy(camData.pos);
        
        // 2. Tentukan arah hadap
        camera.lookAt(camData.target);
        
        console.log(`Kamera ${currentCamIndex + 1} aktif.`);
    }

    // Tombol P untuk Print/Log Koordinat saat ini
    if (e.code === 'KeyP') {
        // 1. Ambil posisi kamera saat ini
        const p = camera.position;
        
        // 2. Ambil arah pandang kamera (vektor depan)
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        
        // 3. Hitung titik target (posisi + arah * jarak pandang 5 meter)
        const target = new THREE.Vector3().copy(p).add(dir.multiplyScalar(5));

        console.clear();
        console.log("=== DATA KAMERA UTK COPY PASTE ===");
        console.log(`pos: new THREE.Vector3(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}),`);
        console.log(`target: new THREE.Vector3(${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)})`);
        console.log("==================================");
    }
});
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

        // 2. Cek Area
        const inArea1 = 
            vase.position.x >= flatBoxBB.min.x && 
            vase.position.x <= flatBoxBB.max.x &&
            vase.position.z >= flatBoxBB.min.z && 
            vase.position.z <= flatBoxBB.max.z;

        const inArea2 = 
            vase.position.x >= flatBox2BB.min.x && 
            vase.position.x <= flatBox2BB.max.x &&
            vase.position.z >= flatBox2BB.min.z && 
            vase.position.z <= flatBox2BB.max.z;

        // --- LOGIKA UTAMA ---
        if (inArea2 && vase.position.y <= SURFACE_2_Y) {
            vase.position.y = SURFACE_2_Y;
            vaseVelocityY = 0;
            if (isTumbling) {
                rollSpeed = 0.0005; 
                isTumbling = false; 
            } 
        } 
        else if (inArea1 && vase.position.y <= SURFACE_1_Y) {
            isTumbling = true; 
        }

        if (isTumbling) {
            vase.position.x += 0.0005; 
            vase.rotation.z -= 0.00585; 
        }

        if (rollSpeed > 0) {
            vase.position.z -= rollSpeed; 
            vase.rotation.x -= rollSpeed * 13; 
            rollSpeed *= 0.997; 

            if (rollSpeed < 0.0001) rollSpeed = 0; 
        }

        // Reset
        if (vase.position.y < -5) {
            vase.position.set(-2.03, 0.5, -1.75); 
            vase.rotation.set(0, 0, 0); 
            vaseVelocityY = 0;
            isTumbling = false;
            rollSpeed = 0; 
        }
    }
}

function updateDoor() {
    if (!doorHinge) return;

    // Ambil waktu global
    const timeElapsed = clock.getElapsedTime();

    // Reset status sementara
    isOpen = false;

    // Logika Waktu
    if (timeElapsed >= 38.2) {
        isOpen = true;  // Setelah detik 34: Buka Lagi
    } else if (timeElapsed >= 28) {
        isOpen = false; // Antara detik 29 s/d 34: Tutup
    } else if (timeElapsed >= 23) {
        isOpen = true;  // Antara detik 24 s/d 29: Buka
    } 
    // Di bawah 24 detik tetap false (tutup) sesuai default di atas

    const targetRotation = isOpen ? -(Math.PI + 1.5) : -Math.PI;
    
    // Animasi lerp
    doorHinge.rotation.y = THREE.MathUtils.lerp(
        doorHinge.rotation.y, 
        targetRotation, 
        0.05 
    );
}

function updateDrawers() {
    // Ambil waktu global saat ini
    const timeElapsed = clock.getElapsedTime();

    // --- DRAWER KIRI (Buka setelah 28 detik) ---
    if (drawerLeft) {
        // Cek waktu > 28 detik
        const isLeftOpen = timeElapsed > 27; 
        
        // Target Z: -0.85 (Buka), -0.65 (Tutup)
        const targetZLeft = isLeftOpen ? -0.85 : -0.65;
        
        drawerLeft.position.z = THREE.MathUtils.lerp(drawerLeft.position.z, targetZLeft, 0.05);
    }

    // --- DRAWER KANAN (Buka setelah 27 detik) ---
    if (drawerRight) {
        // Cek waktu > 27 detik
        const isRightOpen = timeElapsed > 26;
        
        // Target Z: -0.85 (Buka), -0.65 (Tutup)
        const targetZRight = isRightOpen ? -0.85 : -0.65;
        
        drawerRight.position.z = THREE.MathUtils.lerp(drawerRight.position.z, targetZRight, 0.05);
    }
}

function updateLocker() {
    if (!lockerHinge) return;

    // Ambil waktu global
    const time = clock.getElapsedTime();

    const isOpen = (time >= 43.5 && time < 45) || (time >= 49.5 && time < 53);

    // Target Rotasi: 0 (Buka), -90 derajat (Tutup)
    const targetRotation = isOpen ? 0 : -Math.PI * 0.5;

    // Animasi Halus
    lockerHinge.rotation.y = THREE.MathUtils.lerp(
        lockerHinge.rotation.y, 
        targetRotation, 
        0.05
    );
}

function updateCameraCinematics(delta) {
    const time = clock.getElapsedTime();
    let camIdx = -1;

    // --- TIMELINE LOGIC ---
    // Format: Index Array = Nomor Kamera - 1
    
    if (time < 4.0) camIdx = 1; 
    else if (time < 5.5) camIdx = 0; 
    else if (time < 7.5) camIdx = 1; 
    else if (time < 10.5) camIdx = 0; 
    else if (time < 13.0) camIdx = 2; 
    else if (time < 14.5) camIdx = 0; 
    else if (time < 20.5) camIdx = 3; 
    else if (time < 22.5) camIdx = 0; 
    else if (time < 28.0) camIdx = 4; // KAMERA 5 (Target kita)
    else if (time < 31.0) camIdx = 5; 
    else if (time < 33.5) camIdx = 6; 
    else if (time < 36.0) camIdx = 7; 
    else if (time < 38.5) camIdx = 8; 
    else if (time < 40.0) camIdx = 9; 
    else if (time < 42.5) camIdx = 10; 
    else if (time < 53.0) camIdx = 11; 
    else if (time < 63.0) camIdx = 12;

    if (camIdx === -1 || !cameraPositions[camIdx]) return;

    // ==================================================================
    // LOGIKA KHUSUS KAMERA 5 (Gerakan Melengkung/Curved Path)
    // ==================================================================
    // ==================================================================
    // LOGIKA KHUSUS KAMERA 5 (Gerak -> Stop -> Gerak)
    // ==================================================================
    if (camIdx === 4) {
        // --- 1. DEFINISI TITIK ---
        const pStart    = cameraPositions[4].pos;       // Awal
        const pCorner   = new THREE.Vector3(0.98, 1.38, -1.47); // Checkpoint 1 (SUDUT BELOKAN)
        const pPause    = new THREE.Vector3(1.51, 1.38, -1.03); // Checkpoint 2 (TEMPAT STOP)
        const pEnd      = new THREE.Vector3(1.78, 1.38, -1.00); // Akhir (Depan Loker)

        // --- 2. DEFINISI TARGET PANDANGAN ---
        const tStart = cameraPositions[4].target;
        const tEnd   = new THREE.Vector3(3.24, -0.27, 3.49);

        // --- 3. PENGATURAN WAKTU (TIMING) ---
        const t0 = 23.2; // Waktu Mulai
        
        const durationMove1 = 2.5; // Total waktu Fase 1 (Start -> Corner -> Pause)
        const durationStop  = 0.5; 
        const durationMove2 = 1.2; 

        const t1 = t0 + durationMove1; 
        const t2 = t1 + durationStop; 
        const t3 = t2 + durationMove2; 

        // ================= LOGIKA PERGERAKAN =================
        
        if (time < t1) {
            // --- FASE 1: GERAK PATAH-PATAH (LANCIP) ---
            // Start -> Corner -> Pause
            
            // Hitung progress keseluruhan fase 1 (0.0 - 1.0)
            let progress = (time - t0) / durationMove1;
            progress = Math.max(0, Math.min(1, progress));

            // Kita bagi perjalanan menjadi 2 bagian (Split di 50% perjalanan)
            // Bagian A: Start menuju Corner (0% - 50%)
            // Bagian B: Corner menuju Pause (50% - 100%)
            
            if (progress < 0.5) {
                // === BAGIAN A: START -> CORNER ===
                // Normalisasi progress (0.0 s/d 0.5 menjadi 0.0 s/d 1.0)
                let localProgress = progress / 0.5; 
                camera.position.copy(pStart).lerp(pCorner, localProgress);
            } else {
                // === BAGIAN B: CORNER -> PAUSE ===
                // Normalisasi progress (0.5 s/d 1.0 menjadi 0.0 s/d 1.0)
                let localProgress = (progress - 0.5) / 0.5;
                camera.position.copy(pCorner).lerp(pPause, localProgress);
            }
            
            // LookAt: Tetap dibuat halus (smooth) dari awal sampai akhir
            // Supaya kepala tidak pusing meski badannya belok tajam
            const currentTarget = new THREE.Vector3().copy(tStart).lerp(tEnd, progress * 0.8);
            camera.lookAt(currentTarget);

        } else if (time < t2) {
            // --- FASE 2: BERHENTI SEJENAK (PAUSE) ---
            camera.position.copy(pPause);
            
            // Pandangan tetap di 80%
            const currentTarget = new THREE.Vector3().copy(tStart).lerp(tEnd, 0.8);
            camera.lookAt(currentTarget);

        } else if (time < t3) {
            // --- FASE 3: LANJUT JALAN KE ENDING (LURUS) ---
            let progress = (time - t2) / durationMove2;
            progress = Math.max(0, Math.min(1, progress));

            camera.position.copy(pPause).lerp(pEnd, progress);

            // LookAt: Melanjutkan sisa rotasi (80% ke 100%)
            const lookAtStartPhase3 = new THREE.Vector3().copy(tStart).lerp(tEnd, 0.8);
            const currentTarget = new THREE.Vector3().copy(lookAtStartPhase3).lerp(tEnd, progress);
            camera.lookAt(currentTarget);

        } else {
            // --- FASE 4: SELESAI ---
            camera.position.copy(pEnd);
            camera.lookAt(tEnd);
        }

        return; 
    }
    // ==================================================================

    // --- TERAPKAN POSISI KAMERA ---
    // Hanya update jika index valid dan kita masih dalam periode cutscene (< 63 detik)
    if (camIdx !== -1 && cameraPositions[camIdx]) {
        const camData = cameraPositions[camIdx];
        
        // Pindah posisi
        camera.position.copy(camData.pos);

        if (time < 4.0) {
            camera.position.y -= (time * 0.05); 
        }
        else if (time > 5.5 && time < 7.5) {
            camera.position.y -= (time * 0.025);
        }

        else if (time > 10.5 && time < 13.0) {
            camera.position.y -= (time * 0.03);
        }

        // C. Terakhir, kunci arah pandang
        camera.lookAt(camData.target);
    }
    if (heldKey) {
        if (camIdx === 6 || camIdx === 8) {
            heldKey.visible = true;
        } else {
            heldKey.visible = false;
        }
    }
}

// ================= FADE EFFECT SETUP =================
// 1. Membuat layar hitam transparan
const fadeOverlay = document.createElement('div');
fadeOverlay.style.position = 'absolute';
fadeOverlay.style.top = '0';
fadeOverlay.style.left = '0';
fadeOverlay.style.width = '100%';
fadeOverlay.style.height = '100%';
fadeOverlay.style.backgroundColor = 'black';
fadeOverlay.style.opacity = '0';
fadeOverlay.style.pointerEvents = 'none';
fadeOverlay.style.zIndex = '999';
document.body.appendChild(fadeOverlay);

// 2. Daftar waktu kapan kamera berganti (Sesuai timeline Anda)
// Saya ambil angka batas dari logika if-else kamera Anda
const cutTimes = [
    4.0, 
    5.5, 
    7.5, 
    10.5, 
    13.0, 
    14.5, 
    20.5, 
    28.0, 
    31.0, 
    33.5, 
    36.0,
    38.5, 
    40.0, 
    42.5, 
    53.0,
    63.0
];

// 3. Fungsi untuk menghitung kegelapan
function updateFadeEffect() {
    const time = clock.getElapsedTime();
    const fadeDuration = 0.25; // Durasi efek (0.5 detik gelap sebelum & sesudah cut)
    
    let maxOpacity = 0;

    // Cari waktu cut yang paling dekat dengan waktu sekarang
    for (let i = 0; i < cutTimes.length; i++) {
        const cutTime = cutTimes[i];
        const diff = Math.abs(time - cutTime);

        // Jika waktu sekarang berjarak kurang dari 0.5 detik dari waktu cut
        if (diff < fadeDuration) {
            // Hitung opacity: Semakin dekat ke waktu cut, semakin hitam (1)
            // Di waktu cut pas, opacity = 1. Di batas fadeDuration, opacity = 0.
            const opacity = 1 - (diff / fadeDuration);
            
            // Simpan opacity tertinggi (agar tidak bentrok antar cut yang terlalu dekat)
            if (opacity > maxOpacity) {
                maxOpacity = opacity;
            }
        }
    }

    // Terapkan ke layar hitam
    fadeOverlay.style.opacity = maxOpacity;
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

        const timeElapsed = clock.getElapsedTime();

        if (timeElapsed < 21) {
            targetPos.set(-1.50, grannyPivot.position.y, 0);
        } else {
            targetPos.set(0.37, grannyPivot.position.y, 0.73);
        }

        dummyTarget.position.copy(grannyPivot.position);
        dummyTarget.lookAt(targetPos); 
        grannyPivot.quaternion.slerp(dummyTarget.quaternion, 0.3);
    }

    updateCameraCinematics(delta);
    updateFadeEffect();
    
    updateDoor();
    updateDrawers();
    updateLocker();
    handleMovement();
    updateFallingInteractions();
    updatePlankPhysics();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
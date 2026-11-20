"""Run from Blender with the repository as cwd. Builds in an isolated scene."""
import bpy, math, os
from pathlib import Path
root = Path(os.environ.get("CONVERSEBETTER_ROOT", os.getcwd()))
original = bpy.context.window.scene
scene = bpy.data.scenes.new("Margaret seated")
bpy.context.window.scene = scene
def material(name, rgb):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    return m
skin = material("Warm ochre", (.67,.39,.25))
sage = material("Sage linen", (.34,.41,.24))
hair = material("Silver hair", (.36,.32,.29))
dark = material("Dark walnut", (.09,.055,.04))
rose = material("Muted rose", (.46,.20,.16))
def oval(name, xyz, size, mat, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12)
    obj = bpy.context.object
    obj.name = name
    obj.parent = parent
    obj.location = xyz
    obj.scale = size
    obj.data.materials.append(mat)
    for poly in obj.data.polygons: poly.use_smooth=True
    return obj
body = oval("Blouse",(0,0,0),(.53,.32,.62),sage)
head = oval("Head",(0,0,.83),(.35,.31,.42),skin)
oval("Silver waves",(0,.16,.54),(1.04,.95,.60),hair,head)
oval("Bun",(0,.93,.67),(.49,.50,.41),hair,head)
oval("Nose",(0,-.97,-.02),(.15,.18,.20),skin,head)
mouth = oval("Lips",(0,-.93,-.38),(.36,.07,.055),rose,head)
mouth.shape_key_add(name="Basis")
for name,curve,gape in [("happy",.64,1),("worried",-.42,1),("confused",.18,1.6),("scared",-.15,3),("angry",-.65,.65)]:
    key = mouth.shape_key_add(name=name)
    for v in key.data:
        v.co.z = v.co.z*gape+curve*abs(v.co.x)**2+(v.co.x if name=="confused" else 0)
gold=material("Brushed bronze",(.39,.23,.10))
for side in [-1,1]:
    bpy.ops.mesh.primitive_torus_add(major_segments=40, minor_segments=8,major_radius=1,minor_radius=.055)
    ring=bpy.context.object
    ring.name="Spectacle rim"
    ring.parent=head
    ring.location=(side*.44,-.95,.13)
    ring.rotation_euler.x=math.pi/2
    ring.scale=(.39,.32,.29)
    ring.data.materials.append(gold)
    for j in range(4):
        lock=oval("Swept silver wave",(side*(.17+j*.18),-.70+j*.085,.83-j*.08),(.32,.17,.19),hair,head)
        lock.rotation_euler.y=side*.45
    collar=oval("Linen collar",(side*.105,-.275,.42),(.10,.035,.18),sage)
    collar.rotation_euler.y=side*.42
oval("Bridge",(0,-.98,.18),(.12,.04,.035),gold,head)
for j in range(4): oval("Horn button",(0,-.32,.23-j*.14),(.024,.025,.024),gold)
hands=[]
for side in [-1,1]:
    x=side*.40
    eye=oval("Eye",(x,-.89,.16),(.105,.08,.075),dark,head)
    brow=oval("Brow",(x,-.86,.36),(.24,.05,.045),hair,head)
    brow.rotation_euler.y=side*.12
    oval("Ear",(side*.94,0,.02),(.16,.20,.27),skin,head)
    oval("Jade stud",(side*.99,-.12,-.15),(.08,.09,.09),sage,head)
    oval("Sleeve",(side*.45,0,.02),(.19,.23,.36),sage)
    oval("Forearm",(side*.45,-.23,-.20),(.13,.30,.14),skin)
    hand=oval("Palm",(side*.43,-.51,-.20),(.14,.16,.075),skin)
    hands.append(hand)
    for n in range(4):
        oval("Finger",((n-1.5)*.44,-.91,0),(.19,.67,.46),skin,hand)
    oval("Thumb",(-side*.92,-.3,.09),(.28,.65,.58),skin,hand)
for name,obj,axis,angle in [("Look toward object",head,2,.4),("Listen",head,0,.12),("Decline gently",head,2,-.24),("Demonstrate fold",hands[1],0,-.52),("Return to activity",head,0,.32)]:
    for frame,value in [(1,0),(15,angle),(32,0)]:
        obj.rotation_euler[axis]=value
        obj.keyframe_insert(data_path="rotation_euler",frame=frame)
    anim=obj.animation_data
    action=anim.action
    action.name=name
    track=anim.nla_tracks.new()
    track.name=name
    track.strips.new(name,1,action)
    anim.action=None
scene.frame_set(1)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=str(root/"public/visit/margaret.glb"),use_selection=True,use_active_scene=True,export_animation_mode="NLA_TRACKS")
bpy.data.libraries.write(str(root/"assets/margaret/margaret.blend"),{scene},fake_user=True,compress=True)
bpy.context.window.scene=original

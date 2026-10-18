// TC layouts (src/server/game/Server/Packets/MovementPackets.cpp) transcribed as reader specs.
export function transport(r) {
  r.guid("Transport.Guid"); r.f32("T.X"); r.f32("T.Y"); r.f32("T.Z"); r.f32("T.O");
  r.i8("T.Seat"); r.u32("T.Time");
  const prev = r.bit("T.HasPrevTime"), veh = r.bit("T.HasVehicleId");
  if (prev) r.u32("T.PrevTime");
  if (veh) r.u32("T.VehicleId");
}

// MovementPackets.cpp:117 operator>>(MovementInfo)
export function movementInfo(r) {
  r.guid("Guid"); r.u32("Flags"); r.u32("Flags2"); r.u32("Flags3"); r.u32("Time");
  r.f32("X"); r.f32("Y"); r.f32("Z"); r.f32("O"); r.f32("Pitch"); r.f32("StepUpStartElevation");
  const n = r.u32("RemoveForcesCount"); r.u32("MoveIndex"); r.f32("GravityModifier");
  for (let i = 0; i < n; i++) r.guid("RemoveForce");
  const standing = r.bit("HasStandingOnGO"), tr = r.bit("HasTransport"), fall = r.bit("HasFall");
  r.bit("HasSpline"); r.bit("HeightChangeFailed"); r.bit("RemoteTimeValid");
  const inertia = r.bit("HasInertia"), adv = r.bit("HasAdvFlying"), drive = r.bit("HasDriveStatus");
  if (tr) transport(r);
  if (standing) r.guid("StandingOnGO");
  if (inertia) { r.u32("Inertia.ID"); r.f32("Inertia.X"); r.f32("Inertia.Y"); r.f32("Inertia.Z"); r.u32("Inertia.Lifetime"); }
  if (adv) { r.f32("Adv.Fwd"); r.f32("Adv.Up"); }
  if (fall) {
    r.u32("FallTime"); r.f32("ZSpeed");
    if (r.bit("HasFallDirection")) { r.f32("Sin"); r.f32("Cos"); r.f32("XYSpeed"); }
  }
  if (drive) { r.f32("Drive.Speed"); r.f32("Drive.Angle"); r.bit("Accel"); r.bit("Drift"); }
}

// MovementPackets.cpp:744 operator>>(MovementForce) == writer at :486
export function movementForce(r) {
  r.guid("MF.ID"); r.f32("MF.OX"); r.f32("MF.OY"); r.f32("MF.OZ");
  r.f32("MF.DX"); r.f32("MF.DY"); r.f32("MF.DZ");
  r.u32("MF.TransportID"); r.f32("MF.Magnitude"); r.i32("MF.Unused910");
  r.u32("MF.x1"); r.u32("MF.x2"); r.u32("MF.x3");
  r.bits(2, "MF.Type");
}

const ack = (r) => { movementInfo(r); r.i32("AckIndex"); };

export const specs = {};
for (const n of ["CMSG_MOVE_HEARTBEAT", "CMSG_MOVE_SET_FACING", "CMSG_MOVE_SET_FACING_HEARTBEAT", "CMSG_MOVE_SET_PITCH",
  "CMSG_MOVE_STOP", "CMSG_MOVE_STOP_STRAFE", "CMSG_MOVE_STOP_TURN", "CMSG_MOVE_START_FORWARD", "CMSG_MOVE_START_BACKWARD",
  "CMSG_MOVE_START_STRAFE_LEFT", "CMSG_MOVE_START_STRAFE_RIGHT", "CMSG_MOVE_START_TURN_LEFT", "CMSG_MOVE_START_TURN_RIGHT",
  "CMSG_MOVE_FALL_LAND", "CMSG_MOVE_JUMP", "CMSG_MOVE_START_ASCEND", "CMSG_MOVE_STOP_ASCEND", "CMSG_MOVE_START_DESCEND",
  "CMSG_MOVE_SET_FLY", "CMSG_MOVE_START_SWIM", "CMSG_MOVE_STOP_SWIM", "CMSG_MOVE_SET_RUN_MODE", "CMSG_MOVE_SET_WALK_MODE",
  "CMSG_MOVE_START_PITCH_UP", "CMSG_MOVE_START_PITCH_DOWN", "CMSG_MOVE_STOP_PITCH", "CMSG_MOVE_FALL_RESET", "CMSG_MOVE_DOUBLE_JUMP",
  "CMSG_MOVE_CHANGE_TRANSPORT", "CMSG_MOVE_UPDATE_FALL_SPEED", "CMSG_MOVE_SET_ADV_FLY"])
  specs[n] = movementInfo; // ClientPlayerMovement::Read
specs.SMSG_MOVE_UPDATE = movementInfo;
specs.SMSG_MOVE_UPDATE_KNOCK_BACK = movementInfo;
for (const n of ["RUN", "RUN_BACK", "WALK", "SWIM", "SWIM_BACK", "FLIGHT", "FLIGHT_BACK", "TURN_RATE", "PITCH_RATE"])
  specs[`SMSG_MOVE_UPDATE_${n}_SPEED`] = (r) => { movementInfo(r); r.f32("Speed"); };
specs.SMSG_MOVE_UPDATE_TURN_RATE = specs.SMSG_MOVE_UPDATE_TURN_RATE_SPEED;
specs.SMSG_MOVE_UPDATE_COLLISION_HEIGHT = (r) => { movementInfo(r); r.f32("Height"); r.f32("Scale"); };
specs.SMSG_MOVE_UPDATE_TELEPORT = (r) => {
  movementInfo(r); const n = r.u32("ForcesCount");
  const has = []; for (let i = 0; i < 9; i++) has.push(r.bit("HasSpeed" + i));
  for (let i = 0; i < n; i++) movementForce(r);
  for (let i = 0; i < 9; i++) if (has[i]) r.f32("Speed" + i);
};
for (const n of ["CMSG_MOVE_FORCE_ROOT_ACK", "CMSG_MOVE_FORCE_UNROOT_ACK", "CMSG_MOVE_SET_CAN_FLY_ACK", "CMSG_MOVE_ENABLE_SWIM_TO_FLY_TRANS_ACK",
  "CMSG_MOVE_WATER_WALK_ACK", "CMSG_MOVE_INITIAL_OBJECT_UPDATE_COMPLETE_ACK", "CMSG_MOVE_GRAVITY_DISABLE_ACK", "CMSG_MOVE_GRAVITY_ENABLE_ACK",
  "CMSG_MOVE_HOVER_ACK", "CMSG_MOVE_FEATHER_FALL_ACK", "CMSG_MOVE_SET_CAN_TURN_WHILE_FALLING_ACK", "CMSG_MOVE_SET_IGNORE_MOVEMENT_FORCES_ACK",
  "CMSG_MOVE_ENABLE_DOUBLE_JUMP_ACK", "CMSG_MOVE_SET_COLLISION_HEIGHT_ACK_X"])
  specs[n] = ack;
for (const n of ["RUN", "RUN_BACK", "WALK", "SWIM", "SWIM_BACK", "FLIGHT", "FLIGHT_BACK", "TURN_RATE", "PITCH_RATE"])
  specs[`CMSG_MOVE_FORCE_${n}_SPEED_CHANGE_ACK`] = (r) => { ack(r); r.f32("Speed"); };
specs.CMSG_MOVE_SET_COLLISION_HEIGHT_ACK = (r) => { ack(r); r.f32("Height"); r.u32("MountDisplayID"); r.u8("Reason"); };
specs.CMSG_MOVE_KNOCK_BACK_ACK = (r) => { ack(r); if (r.bit("HasSpeeds")) { r.f32("H"); r.f32("V"); } };
specs.CMSG_MOVE_SPLINE_DONE = (r) => { movementInfo(r); r.i32("SplineID"); };
specs.CMSG_MOVE_TELEPORT_ACK = (r) => { r.guid("Mover"); r.i32("AckIndex"); r.i32("MoveTime"); };
specs.CMSG_MOVE_TIME_SKIPPED = (r) => { r.guid("Mover"); r.u32("TimeSkipped"); };
specs.CMSG_MOVE_INIT_ACTIVE_MOVER_COMPLETE = (r) => { r.u32("Ticks"); };
specs.CMSG_SET_ACTIVE_MOVER = (r) => { r.guid("ActiveMover"); };
specs.SMSG_MOVE_SET_ACTIVE_MOVER = (r) => { r.guid("Mover"); };
specs.SMSG_MOVE_TELEPORT = (r) => {
  r.guid("Mover"); r.u32("Seq"); r.f32("X"); r.f32("Y"); r.f32("Z"); r.f32("Facing"); r.u8("PreloadWorld");
  const t = r.bit("HasTransport"), v = r.bit("HasVehicle");
  if (v) { r.u8("Seat"); r.bit("ExitVoluntary"); r.bit("ExitTeleport"); }
  if (t) r.guid("TransportGUID");
};
specs.SMSG_NEW_WORLD = (r) => {
  r.i32("Unused901_1"); r.i32("Unused901_2"); r.i32("MapID"); r.f32("X"); r.f32("Y"); r.f32("Z"); r.f32("O");
  r.u32("Reason"); r.f32("OffX"); r.f32("OffY"); r.f32("OffZ"); r.i32("Counter");
};
specs.SMSG_MOVE_SET_COLLISION_HEIGHT = (r) => { r.guid("Mover"); r.u32("Seq"); r.f32("Height"); r.f32("Scale"); r.u8("Reason"); r.u32("MountDisplayID"); r.i32("ScaleDuration"); };
for (const n of ["RUN", "RUN_BACK", "WALK", "SWIM", "SWIM_BACK", "FLIGHT", "FLIGHT_BACK", "TURN_RATE", "PITCH_RATE"]) {
  specs[`SMSG_MOVE_SPLINE_SET_${n}_SPEED`] = (r) => { r.guid("Mover"); r.f32("Speed"); };
  specs[`SMSG_MOVE_SET_${n}_SPEED`] = (r) => { r.guid("Mover"); r.u32("Seq"); r.f32("Speed"); };
}
for (const n of ["ROOT", "UNROOT", "SET_CAN_FLY", "UNSET_CAN_FLY", "ENABLE_TRANSITION_BETWEEN_SWIM_AND_FLY", "DISABLE_TRANSITION_BETWEEN_SWIM_AND_FLY",
  "SET_WATER_WALK", "SET_LAND_WALK", "SET_HOVERING", "UNSET_HOVERING", "SET_FEATHER_FALL", "SET_NORMAL_FALL", "DISABLE_GRAVITY", "ENABLE_GRAVITY"])
  specs[`SMSG_MOVE_${n}`] = (r) => { r.guid("Mover"); r.u32("Seq"); };
for (const n of ["ROOT", "UNROOT", "ENABLE_GRAVITY", "DISABLE_GRAVITY", "SET_WATER_WALK", "SET_LAND_WALK", "SET_FLYING", "UNSET_FLYING",
  "SET_HOVER", "UNSET_HOVER", "SET_FEATHER_FALL", "SET_NORMAL_FALL", "START_SWIM", "STOP_SWIM", "SET_WALK_MODE", "SET_RUN_MODE"])
  specs[`SMSG_MOVE_SPLINE_${n}`] = (r) => { r.guid("Mover"); };
specs.SMSG_MOVE_INITIAL_OBJECT_UPDATE_COMPLETE = undefined;

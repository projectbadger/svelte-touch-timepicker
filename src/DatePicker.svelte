<script>
  import { createEventDispatcher } from 'svelte';
  import Switcher from './Switcher.svelte';

  export let date = new Date();
  export let visible = false;
  export let years_map = [1900, 2100];
  export let classes = '';
  export let locale = 'en-US';
  export let preserveTime = true;

  let years_count = ((years_map[1] - years_map[0]) + 1);

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
  const YEARS = new Array(years_count).fill(years_map[0]).map((v, i) => v + i);
  const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dispatch = createEventDispatcher();

  let _date, popup;
  $: DAYS = new Array( new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() ).fill(1).map((v, i) => v + i);
  $:  _date = date.toLocaleDateString(locale);




  let resetDate = () => {
    date = new Date();
  }

  let dateChanged = (event) => {

    let {type, changedData} = event.detail;
    let newDate = new Date();

    if (type === 'day') {
      newDate = new Date(date.getFullYear(), date.getMonth(), changedData + 1, date.getHours(), date.getMinutes(), date.getSeconds())
    } else if (type === 'month') {
      let maxDayInSelectedMonth = new Date(date.getFullYear(), changedData + 1, 0, date.getHours(), date.getMinutes(), date.getSeconds()).getDate()
      let day = Math.min(date.getDate(), maxDayInSelectedMonth)
      newDate = new Date(date.getFullYear(), changedData, day)
    } else if (type === 'year') {
      let maxDayInSelectedMonth = new Date(years_map[1] + changedData, date.getMonth() + 1, 0).getDate()
      let day = Math.min(date.getDate(), maxDayInSelectedMonth)
      newDate = new Date(1900 + changedData, date.getMonth(), day, date.getHours(), date.getMinutes(), date.getSeconds())

    }
    if(preserveTime) {
      newDate.setHours(date.getHours());
      newDate.setMinutes(date.getMinutes());
      newDate.setSeconds(date.getSeconds());
    }

    date = newDate;
    dispatch('dateChange', {date});
  }

  function confirmDate(event){
    visible = !visible
    dispatch('confirmDate', {MouseEvent:event, date});
  }

  function clickedOutside(event){
    if(event.target == popup){
      visible = false
    }
  }
</script>

<style>
.touch-date-popup{
  z-index: 1;
  position: fixed;
  top:0;
  left:0;
  right:0;
  bottom:0;
  background: rgba(0, 0, 0, 0.3);
  touch-action: pan-down;
}
.touch-date-popup > div{
  background: var(--svtd-popup-bg-color, white);
  color: var(--svtd-popup-color, black);
  margin-top: 30vh;
  width: 85%;
  margin-left: 7%;
  border-radius: var(--svtd-popup-radius, 10px);
}
.touch-date-wrapper{
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  font-size: var(--svtd-font-size, 20px);
  padding: 1.5rem;
}

.touch-date-picker {
  display: flex;
  padding: 50px 20px;
  margin: 10px 0;
  overflow: hidden;
}

.touch-date-reset > button {
  width: 100px;
  height: 30px;
  border-radius: 15px;
  border: var(--svtd-border, 1px solid grey);
  outline: none;
  color: var(--svtd-button-color, black);
  background-color: var(--svtd-button-bg-color, transparent);
  box-shadow: var(--svtd-button-box-shadow, none) ;
  font-weight: 300;
}
.touch-date-reset button:active {
  -webkit-transform: scale(0.95);
          transform: scale(0.95);
}

.date-line {
  font-size: 30px;
  font-weight: 300;
}
.day-line{
  margin: 2px;
}
</style>

<input type="text" class='{classes}' readonly value={_date} on:focus={() => {visible = !visible}}>
{#if visible}
  <div class="touch-date-popup" on:click={clickedOutside} bind:this={popup}>
    <div>
      <div class="touch-date-wrapper">
        <div class='date-line'>{ date.getDate() } { MONTHS[date.getMonth()] } { date.getFullYear() }</div>
        <p class='day-line'>{ WEEKDAY[date.getDay()] }</p>
        <div class='touch-date-picker'>
          <Switcher type='day' data={DAYS} selected={date.getDate()} on:dateChange={dateChanged}/>
          <Switcher type='month' data={MONTHS} selected={date.getMonth() + 1} on:dateChange={dateChanged}/>
          <Switcher type='year' data={YEARS} selected={date.getYear() + 1} on:dateChange={dateChanged}/>
        </div>
        <div class='touch-date-reset'>
          <button on:click|stopPropagation={resetDate}>Reset</button>
          <button on:click|stopPropagation={confirmDate}>Ok</button>
        </div>
      </div>
    </div>
  </div>
{/if}

